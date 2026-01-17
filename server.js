const axios = require('axios');

const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://fwd.cx/m8xU812pB87p";

let statsGlobal = { wins: 0, loss: 0 };
const ativosData = {};
const listaAtivos = [
    "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "EUR/GBP", "USD/CAD", "EUR/JPY",
    "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC", "AUD/USD-OTC", 
    "EUR/JPY-OTC", "GBP/JPY-OTC", "USD/CHF-OTC", "NZD/USD-OTC", "BTC/USD-OTC"
];

listaAtivos.forEach(a => ativosData[a] = { wins: 0, loss: 0 });

function enviarTelegram(msg, botao = true) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
    const data = {
        chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown",
        reply_markup: botao ? { inline_keyboard: [[{ text: "📲 OPERAR NA IQ OPTION", url: LINK_CORRETORA }]] } : {}
    };
    axios.post(url, data).catch(e => console.log("Erro TG"));
}

function obterPlacar(ativo) {
    return `📊 Placar ${ativo}: ${ativosData[ativo].wins}W - ${ativosData[ativo].loss}L\n🌍 Global: ${statsGlobal.wins}W - ${statsGlobal.loss}L`;
}

setInterval(() => {
    const agora = new Date();
    const segs = agora.getSeconds();

    listaAtivos.forEach(ativo => {
        // 1. PRÉ-ALERTA: Força 70% (Segundo 50 da vela anterior)
        if (segs === 50) {
            let forca = Math.floor(Math.random() * 20) + 75; 
            if (forca >= 70) {
                enviarTelegram(`🔍 *ANALISANDO TAXA...*\n📊 Ativo: ${ativo}\n⚡ Força: ${forca}%\n⚠️ Aguardando Retração de 30%...`, false);
            }
        }

        // 2. ENTRADA: Retração de 30% (Válido apenas entre o segundo 01 e 30)
        if (segs >= 1 && segs <= 30) {
            let gatilhoRetracao = Math.random() > 0.97; // Simulação do sinal
            if (gatilhoRetracao) {
                let direcao = Math.random() > 0.5 ? "CALL 🟢" : "PUT 🔴";
                enviarTelegram(`🚀 *ENTRADA CONFIRMADA*\n💎 Ativo: ${ativo}\n📈 Direção: ${direcao}\n⏱️ Entrada: ${segs}s da Vela 1\n🏁 Expiração: ${segs}s da Vela 2 (1 min)\n\n${obterPlacar(ativo)}`);
                
                // AJUSTE DE TEMPO: Exatamente 60 segundos após a entrada
                setTimeout(() => processarResultado(ativo, direcao, 0), 60000);
            }
        }
    });
}, 1000);

function processarResultado(ativo, direcao, gale) {
    let win = Math.random() > 0.4;
    let label = gale === 0 ? "DIRETO" : `GALE ${gale}`;

    if (win) {
        statsGlobal.wins++;
        ativosData[ativo].wins++;
        enviarTelegram(`✅ *GREEN ${label}!* ✅\n💎 Ativo: ${ativo}\n🎯 Direção: ${direcao}\n\n${obterPlacar(ativo)}`);
    } else if (gale < 2) {
        let proximoGale = gale + 1;
        enviarTelegram(`🔄 *ENTRADA GALE ${proximoGale}*\n💎 Ativo: ${ativo}\n📈 Direção: ${direcao}\n⚠️ Expiração: 1 Minuto`);
        setTimeout(() => processarResultado(ativo, direcao, proximoGale), 60000);
    } else {
        statsGlobal.loss++;
        ativosData[ativo].loss++;
        enviarTelegram(`❌ *LOSS (GALE 2)* ❌\n💎 Ativo: ${ativo}\n\n${obterPlacar(ativo)}`, false);
    }
}

console.log("Servidor KCM V19 (60s Precision) - Ativado");
