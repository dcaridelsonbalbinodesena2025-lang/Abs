const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();

// CONFIGURAÇÕES
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://iqoption.com/trader";

let statsGlobal = { wins: 0, loss: 0, totalAnalises: 0 };
const ativosData = {};
const listaAtivos = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "EUR/USD-OTC", "GBP/USD-OTC"]; // Podes editar aqui

listaAtivos.forEach(a => ativosData[a] = { wins: 0, loss: 0, total: 0 });

// ROTA PARA O PAINEL (INDEX.HTML) LER OS DADOS
app.use(express.static(path.join(__dirname, '.')));
app.get('/dados', (req, res) => {
    const dados = listaAtivos.slice(0, 4).map(ativo => ({ // LIMITA AOS 4 DO PAINEL
        nome: ativo,
        wins: ativosData[ativo].wins,
        loss: ativosData[ativo].loss,
        forca: Math.floor(Math.random() * 20) + 75,
        status: "analisando"
    }));
    res.json(dados);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Robô ON na porta ${PORT}`));

function enviarTelegram(msg, botao = true) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
    const data = {
        chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown",
        reply_markup: botao ? { inline_keyboard: [[{ text: "📲 OPERAR NA IQ OPTION", url: LINK_CORRETORA }]] } : {}
    };
    axios.post(url, data).catch(e => console.log("Erro TG"));
}

// RELATÓRIO DE 5 EM 5 MINUTOS
setInterval(() => {
    let ranking = listaAtivos
        .sort((a, b) => ativosData[b].wins - ativosData[a].wins)
        .map(a => `🔹 ${a}: ${ativosData[a].wins}W - ${ativosData[a].loss}L`).join('\n');

    const eficiencia = statsGlobal.totalAnalises > 0 
        ? ((statsGlobal.wins / statsGlobal.totalAnalises) * 100).toFixed(1) 
        : 0;

    const relatorio = `📊 *RELATÓRIO DE PERFORMANCE*\n\n🏆 *Ranking de Ativos:*\n${ranking}\n\n📈 *Resumo Global:*\n✅ Wins: ${statsGlobal.wins}\n❌ Loss: ${statsGlobal.loss}\n🔍 Total de Análises: ${statsGlobal.totalAnalises}\n🎯 Assertividade: ${eficiencia}%`;
    enviarTelegram(relatorio, false);
}, 300000); // 300.000ms = 5 minutos

// LOOP DE ANÁLISE M1
setInterval(() => {
    const segs = new Date().getSeconds();
    if (segs === 50) {
        listaAtivos.slice(0, 4).forEach(ativo => { // SÓ ANALISA OS 4 ATIVOS
            statsGlobal.totalAnalises++;
            enviarTelegram(`⚠️ *ATENÇÃO M1 - ${ativo}*\n📊 Analisando força atual...\n✅ Wins: ${ativosData[ativo].wins} | ❌ Loss: ${ativosData[ativo].loss}`, false);
        });
    }
    // ... restante da lógica de entrada e Gale que já tens ...
}, 1000);
