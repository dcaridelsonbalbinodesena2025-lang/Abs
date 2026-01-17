const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// 1. A LISTA QUE VAI APARECER QUANDO VOCÊ CLICAR NAS SETINHAS
const listaCompleta = [
    "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "EUR/GBP",
    "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC", "USD/CHF-OTC", 
    "EUR/JPY-OTC", "GBP/JPY-OTC", "AUD/USD-OTC", "BTC/USD-OTC"
];

// 2. OS 4 ATIVOS QUE VOCÊ ESCOLHE NO PAINEL (COMEÇAM VAZIOS OU PADRÃO)
let ativosSelecionados = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];
let ativosData = {};
listaCompleta.forEach(a => ativosData[a] = { wins: 0, loss: 0, total: 0 });

// 3. ROTA QUE ENTREGA A LISTA PARA O SEU PAINEL CLICÁVEL
app.get('/lista-ativos', (req, res) => {
    res.json(listaCompleta);
});

// 4. ROTA QUE RECEBE A SUA ESCOLHA DO PAINEL E MANDA O ROBO MUDAR
app.post('/selecionar-ativo', (req, res) => {
    const { index, ativo } = req.body;
    if (listaCompleta.includes(ativo)) {
        ativosSelecionados[index] = ativo;
        console.log(`Painel mudou bloco ${index} para: ${ativo}`);
        res.json({ status: "sucesso", ativo });
    }
});

app.get('/dados', (req, res) => {
    const dados = ativosSelecionados.map(ativo => ({
        nome: ativo,
        wins: ativosData[ativo].wins,
        loss: ativosData[ativo].loss,
        forca: Math.floor(Math.random() * 15) + 80,
        status: "analisando"
    }));
    res.json(dados);
});

// CONFIGURAÇÕES DO TELEGRAM
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://iqoption.com/trader";

function enviarTelegram(msg, botao = true) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
    const data = {
        chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown",
        reply_markup: botao ? { inline_keyboard: [[{ text: "📲 OPERAR AGORA", url: LINK_CORRETORA }]] } : {}
    };
    axios.post(url, data).catch(e => console.log("Erro TG"));
}

// 5. RELATÓRIO DE 5 EM 5 MINUTOS (RANKING)
setInterval(() => {
    let ranking = ativosSelecionados
        .map(a => `🔹 ${a}: ${ativosData[a].wins}W - ${ativosData[a].loss}L`)
        .join('\n');
    
    enviarTelegram(`📊 *RANKING DOS SELECIONADOS*\n\n${ranking}`, false);
}, 300000);

// 6. O ROBO SÓ ANALISA OS 4 QUE VOCÊ ESCOLHEU NO PAINEL
setInterval(() => {
    const segs = new Date().getSeconds();
    if (segs === 50) {
        ativosSelecionados.forEach(ativo => {
            enviarTelegram(`⚠️ *ATENÇÃO M1 - ${ativo}*\n📊 Analisando...`, false);
            // Aqui entra a sua lógica de análise
        });
    }
}, 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando e ouvindo o painel"));
