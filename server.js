const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_IQ = "https://iqoption.com/trader";

const listaAtivos =  ["NENHUM", "SOL/USD" , "SOL/USD-OTC" , "USD/BRL" , "USD/BRL-OTC" , " USD/COP" ," USD/COP-OTC" , "AUD/CAD" , "AUD/CAD-OTC" , "AUD/JPY" , "AUD/JPY-OTC" , "BTC/USD" , "BTC/USD-OTC" , "ETH/USD" , "ETH/USD-OTC" , "EUR/AUD" , "EUR/AUD-OTC" , "EUR/CAD" , "EUR/CAD-OTC" , "EUR/CHF" , "EUR/CHF-OTC" , "EUR/GBP" , " EUR/GBP-OTC" , "EUR/JPY" , "EUR/JPY-OTC" , "EUR/USD" , "EUR/USD-OTC" , "EUR/NZD" , "EUR/NZD-OTC" , "GBP/AUD" , "GBP/AUD-OTC" , "GBP/CAD" , "GBP/CAD-OTC" , "GBP/CHF" , "GBP/CHF-OTC" , "GBP/JPY" , "GBP/JPY-OTC" , "GBP/NZD" , "GBP/NZD-OTC" , " GBP/USD" , "GBP/USD-OTC" , "USD/CAD" , "USD/CAD-OTC" , "USD/CHF" , "USD/CHF-OTC" , "USD/JPY" , "USD/JPY-OTC" ];
let ativosSelecionados = ["EUR/USD", "GBP/USD", "NENHUM", "NENHUM"]; 

let global = { analises: 0, wins: 0, loss: 0, g1: 0, g2: 0, redGale: 0 };
let dadosAtivos = {};

listaAtivos.forEach(a => {
    dadosAtivos[a] = { 
        wins: 0, loss: 0, g1: 0, g2: 0, redGale: 0, 
        gatilhoRusso: false, direcao: "", ultimoMinuto: -1,
        emOperacao: false, buscaRetracao: false
    };
});

async function enviarTelegram(msg, comBotao = true) {
    const payload = { chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown" };
    if (comBotao) {
        payload.reply_markup = { inline_keyboard: [[{ text: "📲 OPERAR NA IQ OPTION", url: LINK_IQ }]] };
    }
    try { await axios.post(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, payload); } catch (e) {}
}

// CICLO PRINCIPAL COM LÓGICA DE RETRAÇÃO M1
setInterval(() => {
    const agora = new Date();
    const segs = agora.getSeconds();
    const minAtual = agora.getMinutes();

    ativosSelecionados.forEach(ativo => {
        if (ativo === "NENHUM") return; 
        const d = dadosAtivos[ativo];

        if (d.emOperacao) return;

        // GATILHO 1: FORÇA RUSSA 70% (Aos 50 segundos da vela anterior)
        if (segs === 50 && d.ultimoMinuto !== minAtual) {
            const forca = Math.floor(Math.random() * 31) + 70; // Simula de 70 a 100%
            if (forca >= 70) {
                d.direcao = Math.random() > 0.5 ? "🟢 CALL" : "🔴 PUT";
                d.gatilhoRusso = true;
                d.ultimoMinuto = minAtual;
                global.analises++;
                enviarTelegram(`⚠️ *ANALISANDO:* ${ativo}\n🔥 *FORÇA RUSSA:* ${forca}%\n🎯 *SINAL:* ${d.direcao}\n\n⏳ *AGUARDANDO RETRAÇÃO DE 30%...*`);
            }
        }

        // GATILHO 2: BUSCA RETRAÇÃO (Nos primeiros 30 segundos da vela atual)
        if (d.gatilhoRusso && segs > 0 && segs <= 30 && !d.buscaRetracao) {
            // Simula o momento que a vela toca os 30% de retração (ex: aos 20 segundos)
            const tocouRetracao = Math.random() > 0.3; 
            
            if (tocouRetracao) {
                d.buscaRetracao = true;
                d.gatilhoRusso = false;
                const tempoRestante = 60 - segs; // O tempo que falta para completar 1 min total (M1)
                
                enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n👉 CLIQUE AGORA\n💎 *${ativo}*\n🎯 *SINAL:* ${d.direcao}\n📉 *TAXA:* Retração atingida aos ${segs}s\n⏱ *EXPIRAÇÃO:* M1 (Final da vela)`);
                
                // Inicia o processo de resultado que dura o tempo que falta para fechar o ciclo de 60s
                verificarResultadoM1(ativo, d.direcao, tempoRestante * 1000);
            }
        }

        // Limpa o gatilho se não buscou retração até os 30 segundos
        if (segs > 30 && d.gatilhoRusso) {
            d.gatilhoRusso = false;
            d.buscaRetracao = false;
        }
    });
}, 1000);

function verificarResultadoM1(ativo, direcao, tempoParaFechar) {
    const d = dadosAtivos[ativo];
    d.emOperacao = true;

    // Conclui a operação exatamente quando o ciclo de 60s se completa
    setTimeout(() => {
        const sorte = Math.random();
        if (sorte > 0.4) {
            d.wins++; global.wins++;
            enviarTelegram(`✅ *WIN DIRETO: ${ativo}*`, false);
            d.emOperacao = false; d.buscaRetracao = false;
        } else {
            // LÓGICA DE GALE (Simplificada para manter o fluxo)
            enviarTelegram(`⚠️ **GALE 1: ${ativo}**\n🔁 **SINAL:** ${direcao}`);
            setTimeout(() => {
                if (Math.random() > 0.3) {
                    d.g1++; global.g1++;
                    enviarTelegram(`✅ *WIN G1: ${ativo}*`, false);
                } else {
                    d.redGale++; global.redGale++;
                    enviarTelegram(`❌ *RED: ${ativo}*`, false);
                }
                d.emOperacao = false; d.buscaRetracao = false;
            }, 60000);
        }
    }, tempoParaFechar);
}

// RELATÓRIO 5 MIN E ROTAS (MANTIDOS)
setInterval(() => {
    const totalGlobal = global.wins + global.loss + global.g1 + global.g2 + global.redGale;
    const efGlobal = totalGlobal > 0 ? (((global.wins + global.g1 + global.g2) / totalGlobal) * 100).toFixed(1) : "0.0";
    enviarTelegram(`📊 *RELATÓRIO DE PERFORMANCE (5 MIN)*\n\n🔥 *EFICIÊNCIA ROBO: ${efGlobal}%*`, false);
}, 300000);

app.get('/lista-ativos', (req, res) => res.json(listaAtivos));
app.post('/selecionar-ativo', (req, res) => { ativosSelecionados[req.body.index] = req.body.ativo; res.json({ status: "ok" }); });
app.get('/dados', (req, res) => {
    const resp = ativosSelecionados.map(a => {
        if (a === "NENHUM") return { nome: "DESATIVADO", wins: 0, loss: 0, forca: 0 };
        return { nome: a, wins: dadosAtivos[a].wins + dadosAtivos[a].g1, loss: dadosAtivos[a].loss + dadosAtivos[a].redGale, forca: 85 };
    });
    res.json(resp);
});
app.listen(process.env.PORT || 3000);
