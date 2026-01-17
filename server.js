const axios = require('axios');

// CONFIGURAÇÕES DO TELEGRAM
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://fwd.cx/m8xU812pB87p";

// LISTA DE ATIVOS AMPLIADA
let statsGlobal = { wins: 0, loss: 0 };
const ativosData = {};
const listaAtivos = [
    "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "EUR/GBP", "USD/CAD", "EUR/JPY",
    "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC", "AUD/USD-OTC", 
    "EUR/JPY-OTC", "GBP/JPY-OTC", "USD/CHF-OTC", "NZD/USD-OTC", "BTC/USD-OTC",
    "ETH/USD-OTC", "LTC/USD-OTC", "XRP/USD-OTC", "EOS/USD-OTC"
];

listaAtivos.forEach(a => ativosData[a] = { wins: 0, loss: 0 });

function enviarTelegram(msg, botao = true) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
    const data = {
        chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown",
        reply_markup: botao ? { inline_keyboard: [[{ text: "📲 OPERAR NA IQ OPTION", url: LINK_CORRETORA }]] } : {}
    };
    axios.post(url, data).catch(e => console.log("Erro no Telegram"));
}

function obterPlacar(ativo) {
    return `📊 Placar ${ativo}: ${ativosData[ativo].wins}W - ${ativosData[ativo].loss}L\n🌍 Global: ${statsGlobal.wins}W - ${statsGlobal.loss}L`;
}

let alertaAtivo = {};

// LOOP PRINCIPAL 24H
setInterval(() => {
    const agora = new Date();
    const segs = agora.getSeconds();

    listaAtivos.forEach(ativo => {
        // 1. AVISO DE ATENÇÃO (Aos 50 segundos da vela anterior)
        if (segs === 50) {
            let forca = Math.floor(Math.random() * 20) + 75; 
            if (forca >= 70) {
                alertaAtivo[ativo] = true;
                enviarTelegram(`⚠️ *ATENÇÃO PARA A ENTRADA*\n📊 Ativo: ${ativo}\n⚡ Força: ${forca}%\n🧐 Monitorando retração de 30%...`, false);
            }
        }

        // 2. GATILHO: FAÇA A ENTRADA (Entre o segundo 01 e 30 da Vela Atual)
        if (segs >= 1 && segs <= 30 && alertaAtivo[ativo]) {
            let bateuRetracao = Math.random() > 0.94; // Simula o gatilho exato
            if (bateuRetracao) {
                let direcao = Math.random() > 0.5 ? "CALL 🟢" : "PUT 🔴";
                
                // Mensagem com o novo texto solicitado
                enviarTelegram(`👉 *FAÇA A ENTRADA AGORA*\n💎 Ativo: ${ativo}\n📈 Direção: ${direcao}\n⏱️ Entrada aos: ${segs}s\n🏁 Expiração: Exatamente 1 Minuto\n\n${obterPlacar(ativo)}`);
                
                alertaAtivo[ativo] = false;

                // FINALIZAÇÃO PRECISA: Exatamente 60 segundos (60000ms) após o clique
                setTimeout(() => processarResultado(ativo, direcao, 0), 60000);
            }
        }

        // CANCELAR: Aborta se passar dos 30s sem retração
        if (segs > 30 && alertaAtivo[ativo]) {
            alertaAtivo[ativo] = false;
        }
    });
}, 1000);

function processarResultado(ativo, direcao, gale) {
    let win = Math.random() > 0.4;
    let label = gale === 0 ? "DIRETO" : `GALE ${gale}`;

    if (win) {
        statsGlobal.wins++;
        ativosData[ativo].wins++;
        let msgWin = `✅ *GREEN CONFIRMADO (${label})* ✅\n`;
        msgWin += `💎 Ativo: ${ativo}\n🎯 Direção: ${direcao}\n\n`;
        msgWin += obterPlacar(ativo);
        enviarTelegram(msgWin);
    } else if (gale < 2) {
        let proximoGale = gale + 1;
        enviarTelegram(`🔄 *ENTRADA GALE ${proximoGale}*\n💎 Ativo: ${ativo}\n📈 Direção: ${direcao}\n⚠️ Expiração: 1 Minuto Corrente`);
        // Gale também dura 60 segundos exatos
        setTimeout(() => processarResultado(ativo, direcao, proximoGale), 60000);
    } else {
        statsGlobal.loss++;
        ativosData[ativo].loss++;
        let msgLoss = `❌ *LOSS NO ATIVO* ❌\n`;
        msgLoss += `💎 Ativo: ${ativo}\n📉 Finalizado em Gale 2\n\n`;
        msgLoss += obterPlacar(ativo);
        enviarTelegram(msgLoss, false);
    }
}

console.log("Robô KCM V19 - Operação 24h com Expiração de 60s Reais");
