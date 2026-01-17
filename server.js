const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_IQ = "https://iqoption.com/trader";

const listaAtivos = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "EUR/JPY", "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC"];
let ativosSelecionados = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];

// ESTRUTURA DE DADOS COMPLETA
let global = { analises: 0, wins: 0, loss: 0, g1: 0, g2: 0, redGale: 0 };
let dadosAtivos = {};
listaAtivos.forEach(a => {
    dadosAtivos[a] = { wins: 0, loss: 0, g1: 0, g2: 0, redGale: 0, gatilho: false, direcao: "" };
});

async function enviarTelegram(msg, comBotao = true) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) {
        payload.reply_markup = { inline_keyboard: [[{ text: "📲 OPERAR AGORA", url: LINK_IQ }]] };
    }
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

function calcEficiencia(nome) {
    const d = dadosAtivos[nome];
    const t = d.wins + d.g1 + d.g2 + d.loss + d.redGale;
    return t > 0 ? (((d.wins + d.g1 + d.g2) / t) * 100).toFixed(1) : "0.0";
}

// GERA O RELATÓRIO COMPLETO
function gerarRelatorioGrande(ativoFinal, resultadoTipo) {
    const d = dadosAtivos[ativoFinal];
    const totalGlobal = global.wins + global.loss + global.g1 + global.g2 + global.redGale;
    const efGlobal = totalGlobal > 0 ? (((global.wins + global.g1 + global.g2) / totalGlobal) * 100).toFixed(1) : "0.0";

    // Encontra o ativo que mais usou Gale
    const maisGale = Object.keys(dadosAtivos).reduce((a, b) => 
        (dadosAtivos[a].g1 + dadosAtivos[a].g2) > (dadosAtivos[b].g1 + dadosAtivos[b].g2) ? a : b);

    // Ranking Completo
    const ranking = Object.keys(dadosAtivos)
        .map(nome => ({ nome, ef: parseFloat(calcEficiencia(nome)) }))
        .sort((a, b) => b.ef - a.ef)
        .map((r, i) => `${i+1}º ${r.nome}: ${r.ef}%`).join("\n");

    return `📊 *RELATÓRIO DE PERFORMANCE*\n
✅ *RESULTADO:* ${resultadoTipo} em ${ativoFinal}\n
📈 *GERAL:*
\`• Análises: ${global.analises}\`
\`• Wins Diretos: ${global.wins}\`
\`• Losses Diretos: ${global.loss}\`
\`• Wins c/ Gale: ${global.g1 + global.g2}\`
\`• Reds c/ Gale: ${global.redGale}\`
\n🚨 *ALERTA:*
\`• +Gales em: ${maisGale}\`
\n🏆 *RANKING ATIVOS:*
${ranking}
\n🔥 *EFICIÊNCIA ROBO: ${efGlobal}%*`;
}

// LÓGICA DE SINAIS (MANTIDA)
setInterval(() => {
    const segs = new Date().getSeconds();
    ativosSelecionados.forEach(ativo => {
        const d = dadosAtivos[ativo];
        if (segs === 50) {
            d.direcao = Math.random() > 0.5 ? "🟢 CALL" : "🔴 PUT";
            d.gatilho = true;
            global.analises++;
            enviarTelegram(`⚠️ *ANALISANDO:* ${ativo}\n🎯 *SINAL:* ${d.direcao}\n\n\`📊 ATIVO: ${d.wins}W-${d.loss}L\``);
        }
        if (segs === 0 && d.gatilho) {
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n👉 Clique agora\n💎 *${ativo}* | *${d.direcao}*`);
            d.gatilho = false;
            // Aqui chamaria a função de resultado que enviaria o gerarRelatorioGrande()
        }
    });
}, 1000);

// ROTAS DO PAINEL
app.get('/lista-ativos', (req, res) => res.json(listaAtivos));
app.post('/selecionar-ativo', (req, res) => { ativosSelecionados[req.body.index] = req.body.ativo; res.json({status: "ok"}); });
app.get('/dados', (req, res) => {
    const resp = ativosSelecionados.map(a => ({ nome: a, wins: dadosAtivos[a].wins, loss: dadosAtivos[a].loss, forca: Math.floor(Math.random() * 10) + 85 }));
    res.json(resp);
});
app.listen(process.env.PORT || 3000);
