export default {
  async fetch(request: Request, env: any): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ erro: "Método não permitido." }), { 
        status: 405,
        headers: { "Content-Type": "application/json" } 
      });
    }

    try {
      const formData = await request.formData();
      const imagemBase64 = formData.get("imagem_documento");
      const tokenGovBr = formData.get("token_govbr") as string;

      if (!imagemBase64 || !tokenGovBr || tokenGovBr.length < 20) {
        return new Response(JSON.stringify({ erro: "Dados inválidos." }), { status: 400 });
      }

      const dadosExtraidos = {
        nome: "ELEITOR TESTE DA SILVA",
        titulo: "123456789012",
        zona: "123",
        secao: "456",
        timestamp: new Date().toISOString()
      };

      const conteudoTxt = `APOIAMENTO: ${dadosExtraidos.nome} | TITULO: ${dadosExtraidos.titulo} | ZONA: ${dadosExtraidos.zona}`;
      
      const enc = new TextEncoder();
      const chaveBinaria = Uint8Array.from(atob(env.CHAVE_MESTRA_BASE64), c => c.charCodeAt(0));
      
      const cryptoKey = await crypto.subtle.importKey(
        "raw", chaveBinaria, { name: "AES-GCM" }, false, ["encrypt"]
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const bufferCriptografado = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        enc.encode(conteudoTxt)
      );

      const pacoteSeguro = new Uint8Array(iv.length + bufferCriptografado.byteLength);
      pacoteSeguro.set(iv, 0);
      pacoteSeguro.set(new Uint8Array(bufferCriptografado), iv.length);

      const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`;
      const formTelegram = new FormData();
      formTelegram.append("chat_id", env.TELEGRAM_CHAT_ID);
      formTelegram.append("document", new Blob([pacoteSeguro]), `registro_${dadosExtraidos.titulo}.enc`);
      formTelegram.append("caption", "🔒 Apoiamento Blindado.");

      const telegramReq = await fetch(telegramUrl, { method: "POST", body: formTelegram });
      
      if (!telegramReq.ok) {
        const errorData = await telegramReq.text();
        throw new Error(`Erro do Telegram: ${errorData}`);
      }

      return new Response(JSON.stringify({ status: "SUCESSO" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (erro: any) {
      return new Response(JSON.stringify({ erro_critico: erro.message }), { status: 500 });
    }
  }
};
