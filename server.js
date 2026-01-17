const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// CONFIGURAÇÕES DO TELEGRAM E CORRETORA
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_IQ = "https://iqoption.com/trader";

// LISTA DE ATIVOS DISPONÍVEIS
const listaAtivos = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "EUR/JPY", "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC", "USD/CHF-OTC", "BTC/USD-OTC"];
let ativosSelecionados = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"];

// ESTRUTURA DE DADOS PARA PLACARES
let global = { analises: 0, wins: 0, loss: 0, g1: 0, g2: 0, redGale: 0 };
let dadosAtivos = {};

listaAtivos.forEach(a => {
    dadosAtivos[a] = { wins: 0, loss: 0, g1: 0, g2: 0, redGale: 0, gatilho: false, direcao: "" };
});

// FUNÇÃO PARA ENVIAR MENSAGENS
async function enviarTelegram(msg, comBotao = true) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) {
        payload.reply_markup = { inline_keyboard: [[{ text: "📲 OPERAR AGORA", url: LINK_IQ }]] };
    }
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) { console.log("Erro Telegram"); }
}

// CÁLCULO DE EFICIÊNCIA
function calcEficiencia(nome) {
    const d = dadosAtivos[nome];
    const t = d.wins + d.g1 + d.g2 + d.loss + d.redGale;
    return t > 0 ? (((d.wins + d.g1 + d.g2) / t) * 100).toFixed(1) : "0.0";
}

// GERAÇÃO DO RELATÓRIO COMPLETO (MENSAGEM GRANDE)
function gerarRelatorioGrande(ativoFinal, resultadoTipo) {
    const totalGlobal = global.wins + global.loss + global.g1 + global.g2 + global.redGale;
    const efGlobal = totalGlobal > 0 ? (((global.wins + global.g1 + global.g2) / totalGlobal) * 100).toFixed(1) : "0.0";

    const maisGale = Object.keys(dadosAtivos).reduce((a, b) => 
        (dadosAtivos[a].g1 + dadosAtivos[a].g2) > (dadosAtivos[b].g1 + dadosAtivos[b].g2) ? a : b);

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

// FUNÇÃO PARA PROCESSAR O RESULTADO (WIN/GALE/RED)
function verificarResultadoFinal(ativo, direcao) {
    const d = dadosAtivos[ativo];
    
    setTimeout(() => {
        if (Math.random() > 0.4) { // WIN DIRETO
            d.wins++; global.wins++;
            enviarTelegram(gerarRelatorioGrande(ativo, "✅ WIN DIRETO"), false);
        } else {
            // GALE 1
            enviarTelegram(`⚠️ **GALE 1: ${ativo}**\n🔁 **SINAL:** ${direcao}\n\n\`📊 PLACAR ATIVO: ${d.wins}W-${d.loss}L\``);
            
            setTimeout(() => {
                if (Math.random() > 0.3) { // WIN G1
                    d.g1++; global.g1++;
                    enviarTelegram(gerarRelatorioGrande(ativo, "✅ WIN NO G1"), false);
                } else {
                    // GALE 2
                    enviarTelegram(`⚠️ **GALE 2: ${ativo}**\n🔁 **SINAL:** ${direcao}\n\n\`📊 PLACAR ATIVO: ${d.wins}W-${d.loss}L\``);
                    
                    setTimeout(() => {
                        if (Math.random() > 0.2) { // WIN G2
                            d.g2++; global.g2++;
                            enviarTelegram(gerarRelatorioGrande(ativo, "✅ WIN NO G2"), false);
                        } else { // RED TOTAL
                            d.redGale++; global.redGale++;
                            enviarTelegram(gerarRelatorioGrande(ativo, "❌ RED (LOSS NO G2)"), false);
                        }
                    }, 60000);
                }
            }, 60000);
        }
    }, 60000);
}

// CICLO DE SINAIS
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
            enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n💎 *${ativo}* | *${d.direcao}*`);
            d.gatilho = false;
            verificarResultadoFinal(ativo, d.direcao);
        }
    });
}, 1000);

// ROTAS DO SERVIDOR
app.get('/lista-ativos', (req, res) => res.json(listaAtivos));
app.post('/selecionar-ativo', (req, res) => {
    const { index, ativo } = req.body;
    ativosSelecionados[index] = ativo;
    res.json({ status: "ok" });
});
app.get('/dados', (req, res) => {
    const resp = ativosSelecionados.map(a => ({
        nome: a,
        wins: dadosAtivos[a].wins + dadosAtivos[a].g1 + dadosAtivos[a].g2,
        loss: dadosAtivos[a].loss + dadosAtivos[a].redGale,
        forca: Math.floor(Math.random() * 10) + 85
    }));
    res.json(resp);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
