// src/index.ts
// Motor Serverless Blindado - Captura e Envio Seguro de Dados Eleitorais

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  CHAVE_MESTRA_BASE64: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ erro: "Método não permitido." }), { status: 405 });
    }

    try {
      const formData = await request.formData();
      const imagemBase64 = formData.get("imagem_documento") as string | null;
      const tokenGovBr = formData.get("token_govbr") as string | null;

      if (!imagemBase64 || !tokenGovBr || tokenGovBr.length < 20) {
        return new Response(JSON.stringify({ erro: "Dados inválidos." }), { status: 400 });
      }

      // Simulação da IA
      const dadosExtraidos = {
        nome: "ELEITOR TESTE DA SILVA",
        titulo: "123456789012",
        zona: "123",
        secao: "456",
        timestamp: new Date().toISOString()
      };

      // Criptografia AES-256-GCM
      const conteudoTxt = `APOIAMENTO: ${dadosExtraidos.nome} | TITULO: ${dadosExtraidos.titulo} | ZONA: ${dadosExtraidos.zona}`;
      const enc = new TextEncoder();
      
      const chaveRaw = Uint8Array.from(atob(env.CHAVE_MESTRA_BASE64), c => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey(
        "raw", chaveRaw, { name: "AES-GCM" }, false, ["encrypt"]
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const bufferCriptografado = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        cryptoKey,
        enc.encode(conteudoTxt)
      );

      const pacoteSeguro = new Uint8Array(iv.length + bufferCriptografado.byteLength);
      pacoteSeguro.set(iv, 0);
      pacoteSeguro.set(new Uint8Array(bufferCriptografado), iv.length);

      // Envio para Telegram
      const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`;
      const formTelegram = new FormData();
      
      const blobCriptografado = new Blob([pacoteSeguro], { type: "application/octet-stream" });
      formTelegram.append("chat_id", env.TELEGRAM_CHAT_ID);
      formTelegram.append("document", blobCriptografado, `registro_${dadosExtraidos.titulo}.enc`);
      formTelegram.append("caption", "🔒 Apoiamento Blindado.");

      const telegramReq = await fetch(telegramUrl, { method: "POST", body: formTelegram });
      
      if (!telegramReq.ok) throw new Error("Falha na rede do Telegram.");

      return new Response(JSON.stringify({ status: "SUCESSO" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });

    } catch (erro: any) {
      return new Response(JSON.stringify({ erro_critico: erro.message }), { status: 500 });
    }
  },
};
