import readlineSync from 'readline-sync';
import fs from 'fs';
import fetch from 'node-fetch';
import { NlpManager } from 'node-nlp';

// Criação de uma instância do NlpManager
const manager = new NlpManager({ languages: ['pt'] });

// Função para garantir que a URL tem o protocolo
const ensureUrlHasProtocol = (url) => {
  if (!/^https?:\/\//i.test(url)) {
    return `http://${url}`;
  }
  return url;
};

// Função para carregar e adicionar documentos e respostas ao NlpManager
async function loadTrainingData(filePath) {
  const url = ensureUrlHasProtocol('164.152.36.231/JSON/math_questions.json'); // Adiciona o protocolo se faltar

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha na requisição HTTP');
    const jsonData = await response.json();

    for (const intent of jsonData.intents) {
      for (const example of intent.examples) {
        manager.addDocument('pt', example, intent.intent);
      }
      for (const response of intent.responses) {
        manager.addAnswer('pt', intent.intent, response);
      }
    }
  } catch (error) {
    console.error('Erro ao carregar dados remotos, tentando arquivo local...', error);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Adiciona documentos e respostas ao NlpManager
      for (const intent of data.intents) {
        for (const example of intent.examples) {
          manager.addDocument('pt', example, intent.intent);
        }
        for (const response of intent.responses) {
          manager.addAnswer('pt', intent.intent, response);
        }
      }
    } catch (err) {
      console.error('Erro ao ler arquivo local:', err);
    }
  }
}

// Função para efeito de digitação
const typeEffect = (str) => {
  return new Promise((resolve) => {
    console.clear();
    let i = 0;
    const interval = setInterval(() => {
      process.stdout.write(str[i]);
      i++;
      if (i >= str.length) {
        clearInterval(interval);
        console.log(); // Adiciona uma nova linha após o efeito de digitação
        resolve();
      }
    }, Math.floor(1000 / 30)); // Aproximadamente 30 caracteres por segundo
  });
};

(async () => {
  // Carrega e adiciona os dados de treinamento
  await loadTrainingData('math_questions.json');

  // Treina o modelo
  await manager.train();
  manager.save(); // Salva o modelo treinado

  async function main() {
    let running = true;
    while (running) {
      const ask = readlineSync.question('> ');
      const response = await manager.process('pt', ask);
      await typeEffect(response.answer + '\n'); // Aguarda o efeito de digitação terminar
      if (response.intent === 'greeting.bye') {
        running = false;
      }
    }
    console.log('Encerrando o chatbot...');
  }

  await typeEffect("Olá, como posso lhe ajudar?" + '\n'); // Aguarda o efeito de digitação terminar
  await main(); // Aguarda a função principal terminar
})();
