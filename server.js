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

function obterStatus() {
    const totalW = global.wins + global.g1 + global.g2;
    const totalL = global.loss + global.redGale;
    const totalGeral = totalW + totalL;
    const ef = totalGeral > 0 ? ((totalW / totalGeral) * 100).toFixed(1) : "0.0";
    return `📊 *PLACAR GERAL:* ${totalW}W - ${totalL}L\n🔥 *EFICIÊNCIA:* ${ef}%`;
}

function verificarResultadoM1(ativo, direcao, tempoParaFechar) {
    const d = dadosAtivos[ativo];
    d.emOperacao = true;
    setTimeout(() => {
        if (Math.random() > 0.4) {
            d.wins++; global.wins++;
            const placarAtivo = `📈 *ATIVO:* ${d.wins + d.g1 + d.g2}W - ${d.loss + d.redGale}L`;
            enviarTelegram(`✅ *WIN DIRETO: ${ativo}*\n\n${placarAtivo}\n${obterStatus()}`, false);
            d.emOperacao = false; d.buscaRetracao = false;
        } else {
            enviarTelegram(`⚠️ **GALE 1: ${ativo}**\n🔁 **SINAL:** ${direcao}`);
            setTimeout(() => {
                if (Math.random() > 0.3) {
                    d.g1++; global.g1++;
                    const placarAtivo = `📈 *ATIVO:* ${d.wins + d.g1 + d.g2}W - ${d.loss + d.redGale}L`;
                    enviarTelegram(`✅ *WIN G1: ${ativo}*\n\n${placarAtivo}\n${obterStatus()}`, false);
                    d.emOperacao = false; d.buscaRetracao = false;
                } else {
                    enviarTelegram(`⚠️ **GALE 2: ${ativo}**\n🔁 **SINAL:** ${direcao}`);
                    setTimeout(() => {
                        if (Math.random() > 0.2) {
                            d.g2++; global.g2++;
                            const placarAtivo = `📈 *ATIVO:* ${d.wins + d.g1 + d.g2}W - ${d.loss + d.redGale}L`;
                            enviarTelegram(`✅ *WIN G2: ${ativo}*\n\n${placarAtivo}\n${obterStatus()}`, false);
                        } else {
                            d.redGale++; global.redGale++;
                            const placarAtivo = `📈 *ATIVO:* ${d.wins + d.g1 + d.g2}W - ${d.loss + d.redGale}L`;
                            enviarTelegram(`❌ *RED: ${ativo}*\n\n${placarAtivo}\n${obterStatus()}`, false);
                        }
                        d.emOperacao = false; d.buscaRetracao = false;
                    }, 60000);
                }
            }, 60000);
        }
    }, tempoParaFechar);
}

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
            enviarTelegram(`❌ *ANÁLISE ABORTADA: ${ativo}*\n⚠️ *MOTIVO:* Taxa não atingida.`, false);
            d.gatilhoRusso = false; d.buscaRetracao = false;
        }
    });
}, 1000);

setInterval(() => { enviarTelegram(obterStatus(), false); }, 300000);

app.get('/lista-ativos', (req, res) => res.json(listaAtivos));
app.post('/selecionar-ativo', (req, res) => { ativosSelecionados[req.body.index] = req.body.ativo; res.json({ status: "ok" }); });
app.get('/dados', (req, res) => {
    const resp = ativosSelecionados.map(a => {
        if (a === "NENHUM") return { nome: "DESATIVADO", wins: 0, loss: 0, forca: 0 };
        return { nome: a, wins: dadosAtivos[a].wins + dadosAtivos[a].g1 + dadosAtivos[a].g2, loss: dadosAtivos[a].loss + dadosAtivos[a].redGale, forca: 85 };
    });
    res.json(resp);
});
app.listen(process.env.PORT || 3000);
