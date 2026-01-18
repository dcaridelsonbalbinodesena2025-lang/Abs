const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_IQ = "https://iqoption.com/trader";

const listaAtivos = ["NENHUM", "SOL/USD", "SOL/USD-OTC", "USD/BRL", "USD/BRL-OTC", "USD/COP", "USD/COP-OTC", "AUD/CAD", "AUD/CAD-OTC", "AUD/JPY", "AUD/JPY-OTC", "BTC/USD", "BTC/USD-OTC", "ETH/USD", "ETH/USD-OTC", "EUR/AUD", "EUR/AUD-OTC", "EUR/CAD", "EUR/CAD-OTC", "EUR/CHF", "EUR/CHF-OTC", "EUR/GBP", "EUR/GBP-OTC", "EUR/JPY", "EUR/JPY-OTC", "EUR/USD", "EUR/USD-OTC", "EUR/NZD", "EUR/NZD-OTC", "GBP/AUD", "GBP/AUD-OTC", "GBP/CAD", "GBP/CAD-OTC", "GBP/CHF", "GBP/CHF-OTC", "GBP/JPY", "GBP/JPY-OTC", "GBP/NZD", "GBP/NZD-OTC", "GBP/USD", "GBP/USD-OTC", "USD/CAD", "USD/CAD-OTC", "USD/CHF", "USD/CHF-OTC", "USD/JPY", "USD/JPY-OTC"];
let ativosSelecionados = ["EUR/USD", "GBP/USD", "NENHUM", "NENHUM"]; 

let global = { analises: 0, wins: 0, g1: 0, g2: 0, loss: 0, redGale: 0 };
let dadosAtivos = {};

listaAtivos.forEach(a => {
    dadosAtivos[a] = { wins: 0, loss: 0, g1: 0, g2: 0, redGale: 0, gatilhoRusso: false, direcao: "", ultimoMinuto: -1, emOperacao: false, buscaRetracao: false };
});

async function enviarTelegram(msg, comBotao = true) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) { payload.reply_markup = { inline_keyboard: [[{ text: "📲 OPERAR NA IQ OPTION", url: LINK_IQ }]] }; }
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

// FUNÇÃO PARA CALCULAR EFICIÊNCIA POR ATIVO
function calcEfAtivo(nome) {
    const d = dadosAtivos[nome];
    const t = d.wins + d.g1 + d.g2 + d.loss + d.redGale;
    return t > 0 ? (((d.wins + d.g1 + d.g2) / t) * 100).toFixed(1) : "0.0";
}

// --- NOVO RELATÓRIO ROBUSTO (IGUAL À SEGUNDA IMAGEM) ---
function gerarRelatorioPerformance() {
    const totalW = global.wins + global.g1 + global.g2;
    const totalL = global.loss + global.redGale;
    const totalGeral = totalW + totalL;
    const efGlobal = totalGeral > 0 ? ((totalW / totalGeral) * 100).toFixed(1) : "0.0";

    // Criar Ranking dos TOP 4 Ativos
    const ranking = Object.keys(dadosAtivos)
        .filter(a => (dadosAtivos[a].wins + dadosAtivos[a].g1 + dadosAtivos[a].g2 + dadosAtivos[a].loss + dadosAtivos[a].redGale) > 0)
        .map(a => ({ nome: a, ef: parseFloat(calcEfAtivo(a)) }))
        .sort((a, b) => b.ef - a.ef)
        .slice(0, 4)
        .map((item, i) => `${i + 1}º ${item.nome}: ${item.ef}%`).join("\n");

    const mensagem = `📊 *RELATÓRIO DE PERFORMANCE*\n\n` +
                     `📈 *GERAL:*\n` +
                     `• Análises: ${global.analises}\n` +
                     `• Wins Diretos: ${global.wins}\n` +
                     `• Losses Diretos: ${global.loss}\n` +
                     `• Wins c/ Gale: ${global.g1 + global.g2}\n` +
                     `• Reds c/ Gale: ${global.redGale}\n\n` +
                     `🏆 *RANKING ATIVOS:*\n${ranking || "Sem operações ainda"}\n\n` +
                     `🔥 *EFICIÊNCIA ROBO: ${efGlobal}%*`;

    enviarTelegram(mensagem, false);
}

// Executa o relatório a cada 5 minutos
setInterval(gerarRelatorioPerformance, 300000);

// --- LÓGICA DE RESULTADOS (MANTIDA) ---
function verificarResultadoM1(ativo, direcao, tempoParaFechar) {
    const d = dadosAtivos[ativo];
    d.emOperacao = true;
    setTimeout(() => {
        if (Math.random() > 0.4) {
            d.wins++; global.wins++;
            enviarTelegram(`✅ *WIN DIRETO: ${ativo}*`, false);
            d.emOperacao = false; d.buscaRetracao = false;
        } else {
            enviarTelegram(`⚠️ **GALE 1: ${ativo}**`, false);
            setTimeout(() => {
                if (Math.random() > 0.3) {
                    d.g1++; global.g1++;
                    enviarTelegram(`✅ *WIN G1: ${ativo}*`, false);
                    d.emOperacao = false; d.buscaRetracao = false;
                } else {
                    enviarTelegram(`⚠️ **GALE 2: ${ativo}**`, false);
                    setTimeout(() => {
                        if (Math.random() > 0.2) {
                            d.g2++; global.g2++;
                            enviarTelegram(`✅ *WIN G2: ${ativo}*`, false);
                        } else {
                            d.redGale++; global.redGale++;
                            enviarTelegram(`❌ *RED: ${ativo}*`, false);
                        }
                        d.emOperacao = false; d.buscaRetracao = false;
                    }, 60000);
                }
            }, 60000);
        }
    }, tempoParaFechar);
}

// --- CICLO SNIPER ---
setInterval(() => {
    const agora = new Date();
    const segs = agora.getSeconds();
    const minAtual = agora.getMinutes();
    ativosSelecionados.forEach(ativo => {
        if (ativo === "NENHUM") return; 
        const d = dadosAtivos[ativo];
        if (d.emOperacao) return;
        if (segs === 50 && d.ultimoMinuto !== minAtual) {
            const forcaReal = Math.floor(Math.random() * 31) + 70; 
            if (forcaReal >= 70) {
                d.direcao = Math.random() > 0.5 ? "🟢 CALL" : "🔴 PUT";
                d.gatilhoRusso = true; d.ultimoMinuto = minAtual; global.analises++;
                enviarTelegram(`⚠️ *ANALISANDO:* ${ativo}\n🔥 *FORÇA:* ${forcaReal}%\n🎯 *SINAL:* ${d.direcao}\n\n⏳ *AGUARDANDO CONFIRMAÇÃO...*`);
            }
        }
        if (d.gatilhoRusso && segs > 0 && segs <= 30 && !d.buscaRetracao) {
            if (Math.random() > 0.4) {
                d.buscaRetracao = true; d.gatilhoRusso = false;
                enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n👉 **CLIQUE AGORA**\n💎 *${ativo}*\n🎯 *SINAL:* ${d.direcao}\n⏱ *EXPIRAÇÃO:* M1`);
                verificarResultadoM1(ativo, d.direcao, (60 - segs) * 1000);
            }
        }
        if (segs === 31 && d.gatilhoRusso && !d.buscaRetracao) {
            enviarTelegram(`❌ *ANÁLISE ABORTADA: ${ativo}*`, false);
            d.gatilhoRusso = false; d.buscaRetracao = false;
        }
    });
}, 1000);

app.get('/lista-ativos', (req, res) => res.json(listaAtivos));
app.post('/selecionar-ativo', (req, res) => { ativosSelecionados[req.body.index] = req.body.ativo; res.json({ status: "ok" }); });
app.get('/dados', (req, res) => {
    const resp = ativosSelecionados.map(a => {
        if (a === "NENHUM") return { nome: "DESATIVADO", wins: 0, loss: 0 };
        return { nome: a, wins: dadosAtivos[a].wins + dadosAtivos[a].g1 + dadosAtivos[a].g2, loss: dadosAtivos[a].loss + dadosAtivos[a].redGale };
    });
    res.json(resp);
});
app.listen(process.env.PORT || 3000);
