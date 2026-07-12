import { NextResponse } from 'next/server';
import { supabase, type Pauta } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let geminiApiKey = process.env.CUSTOM_GEMINI_API_KEY;
  let wpUrlEnv = process.env.WORDPRESS_URL;
  let wpUser = process.env.WORDPRESS_USERNAME;
  let wpPass = process.env.WORDPRESS_APP_PASSWORD;

  try {
      const fs = require('fs');
      const envLocal = fs.readFileSync('.env.local', 'utf8');
      const parseEnv = (key: string) => {
          const match = envLocal.match(new RegExp(`^${key}=(.*)$`, 'm'));
          return match ? match[1].trim() : null;
      };
      geminiApiKey = parseEnv('CUSTOM_GEMINI_API_KEY') || geminiApiKey;
      wpUrlEnv = parseEnv('WORDPRESS_URL') || wpUrlEnv;
      wpUser = parseEnv('WORDPRESS_USERNAME') || wpUser;
      wpPass = parseEnv('WORDPRESS_APP_PASSWORD') || wpPass;
  } catch (e) {
      // ignore
  }

  let ai: GoogleGenAI | null = null;
  if (geminiApiKey && geminiApiKey !== "MY_GEMINI_API_KEY") {
      ai = new GoogleGenAI({ apiKey: geminiApiKey });
  } else {
      console.warn("AI Not configured. Key:", geminiApiKey ? "Exists (Invalid)" : "Missing");
  }

  // To protect this route from arbitrary calls, we might check an Authorization header.
  // In Vercel, it attaches essentially an Authorization Bearer matching CRON_SECRET.
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')) {
     return NextResponse.json({ message: "Supabase not configured. Mock cron finished." }, { status: 200 });
  }

  let currentPautaId: string | null = null;

  try {
    // 1. A Varredura de Pautas e Histórico do WordPress
    const { data: pautas, error: fetchError } = await supabase
      .from('pautas')
      .select('*')
      .eq('status', 'aguardando')
      .order('data_agendada', { ascending: true })
      .limit(1);

    let pauta: Pauta;
    const recentTitles: string[] = [];

    // Buscar títulos recentes do WordPress para evitar repetição (Trava de 30+ posts)
    if (wpUrlEnv && !wpUrlEnv.includes('your-wp-site.com')) {
        try {
            let apiUrl = wpUrlEnv.replace(/\/$/, '');
            // Se o URL base não tiver wp-json, adicionamos. Se tiver, extraímos o base.
            const urlBase = apiUrl.includes('/wp-json') ? apiUrl.split('/wp-json')[0] : apiUrl;
            const histUrl = `${urlBase}/wp-json/wp/v2/posts?per_page=50&_fields=title`;
            
            const histRes = await fetch(histUrl);
            if (histRes.ok) {
                const posts = await histRes.json();
                posts.forEach((p: any) => recentTitles.push(p.title.rendered));
            }
        } catch (e) {
            console.error("Failed to fetch history from WP", e);
        }
    }

    if (!pautas || pautas.length === 0) {
      // 1.1 GERADOR AUTOMÁTICO DE PAUTAS (Se o banco estiver vazio)
      if (!ai) {
          console.warn("AI not configured, generating fallback pauta");
          const { data: newPauta, error: insertError } = await supabase
            .from('pautas')
            .insert({
                titulo_tema: "Como limpar o cache do celular (Exemplo Automático)",
                status: 'aguardando',
                data_agendada: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) throw insertError;
          pauta = newPauta as Pauta;
      } else {
          const suggestionPrompt = `Você é um estrategista de conteúdo focado em SEO e aprovação no Google AdSense para o site "Onde Eu Clico" (ondeeuclico.com.br).
          Seu nicho é: Acessibilidade Tecnológica e Educação Digital para Leigos e Terceira Idade.
          
          Gere UMA sugestão de pauta (título de artigo) inédita, aprofundada e focada em resolver um problema real, comum e doloroso do dia a dia do usuário. 
          O tema deve permitir um artigo rico e detalhado (E-E-A-T), não apenas um "faça isso e aquilo".
          
          Exemplos de temas ricos e úteis: 
          - "Guia Prático e Seguro: Como limpar a memória do celular sem perder suas fotos"
          - "Como identificar golpes no WhatsApp e proteger sua família (Passo a Passo)"
          - "O que fazer se esqueci a senha do e-mail? (Soluções Definitivas)"
          
          IMPORTANTE: Não repita ideias ou palavras-chave dos seguintes tópicos que já foram publicados recentemente, para evitar conteúdo duplicado:
          ${recentTitles.slice(0, 40).join(', ')}
          
          Retorne APENAS um JSON válido com a chave "titulo_tema".`;

          const suggestionRes = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: suggestionPrompt
          });

          const suggestionText = suggestionRes.text || '';
          const match = suggestionText.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("Falha ao gerar tema automático.");
          
          const { titulo_tema } = JSON.parse(match[0]);
          
          // Salva a nova pauta no banco para ter o registro histórico
          const { data: newPauta, error: insertError } = await supabase
            .from('pautas')
            .insert({
                titulo_tema,
                status: 'aguardando',
                data_agendada: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) throw insertError;
          pauta = newPauta as Pauta;
      }
    } else {
      pauta = pautas[0] as Pauta;
    }

    currentPautaId = pauta.id;

    // 2. A Trava de Segurança
    await supabase
      .from('pautas')
      .update({ status: 'processando' })
      .eq('id', pauta.id);

    // 3. A Geração do Conteúdo Completo
    let generatedPost = { title: '', content: '' };
    
    if (ai) {
        try {
            const prompt = `Você é um especialista em tecnologia e educador digital com anos de experiência em acessibilidade para a terceira idade e iniciantes. 
            Você escreve para o blog "Onde Eu Clico". Seu objetivo é criar conteúdo original, extremamente aprofundado e de alta qualidade (foco total em E-E-A-T - Experiência, Especialidade, Autoridade e Confiabilidade - para aprovação no Google AdSense).
            
            Escreva um post de blog completo, detalhado e humano para o tutorial: "${pauta.titulo_tema}".
            
            DIRETRIZES DE CONTEÚDO (Alta Qualidade):
            1. Inicie o texto com empatia, usando um cenário realista do dia a dia (ex: "Sabe quando você vai tirar uma foto do neto e o celular diz que não tem espaço?"), mostrando compreensão genuína da dificuldade.
            2. Não faça textos superficiais. O artigo deve ser rico em detalhes e utilidade (idealmente +600 palavras). Explique o "porquê" além do "como fazer".
            3. Dicas de Ouro e Segurança: Inclua alertas de segurança, dicas para evitar golpes e uma seção de "Solução de Problemas" (o que fazer se o passo a passo não der certo).
            4. Linguagem: Vocabulário acolhedor e simples. Explique qualquer jargão técnico (como cache, nuvem, link) usando analogias visuais do dia a dia (ex: "a nuvem é como um armário virtual").
            
            REGRAS DE FORMATAÇÃO HTML (Não seja engessado):
            - Como o artigo será renderizado dentro do WordPress, retorne apenas o HTML do miolo. Não use <h1> (o title do JSON já faz esse papel).
            - Use <h2> e <h3> para criar um sumário visual escaneável.
            - Use <p> para parágrafos curtos, ideais para leitura no celular.
            - Use <ul> ou <ol> para listas de materiais ou guias de passos.
            - (Recomendado) Use <blockquote> para responder a uma "Dúvida Muito Comum" ou dar uma dica de ouro.
            - NUNCA use markdown como \`\`\`html no retorno.

            Retorne APENAS um objeto JSON válido com as exatas chaves: "title" (o título atrativo, humano e chamativo) e "content" (todo o corpo do texto do artigo formatado em HTML).`;

            const response = await ai.models.generateContent({
               model: 'gemini-2.5-flash', 
               contents: prompt,
            });

            const responseText = response.text || '';
            // Find JSON in response
            const jsonStrMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonStrMatch) {
                generatedPost = JSON.parse(jsonStrMatch[0]);
            }
        } catch (e: any) {
            console.error("Gemini failed, using fallback:", e?.message || String(e));
            // Keep generatedPost empty so fallback triggers
        }
    } 

    if (!generatedPost.title || !generatedPost.content) {
        // Fallback or mock if no AI configured or if AI failed
        generatedPost = {
            title: `Explicando: ${pauta.titulo_tema}`,
            content: `<h1>${pauta.titulo_tema}</h1><p>Conteúdo gerado automaticamente para explicar sobre este tema para leigos...</p>`
        }
    }

    // 4. A Publicação (WordPress)
    let wpUrl = "";
    let skippedWpReason = "";
    
    if (!wpUrlEnv || wpUrlEnv.includes('your-wp-site.com')) {
        skippedWpReason = "WORDPRESS_URL missing or default";
    } else if (!generatedPost.title) {
        skippedWpReason = "generatedPost.title is empty";
    } else if (generatedPost.title.includes("Exemplo Automático")) {
        skippedWpReason = "Title contains 'Exemplo Automático'";
    }
    
    if (!skippedWpReason) {
        const auth = Buffer.from(`${wpUser}:${wpPass}`).toString('base64');
        
        let apiUrl = wpUrlEnv!;
        if (!apiUrl.includes('wp-json')) {
            apiUrl = apiUrl.replace(/\/$/, '') + '/wp-json/wp/v2/posts';
        }
        
        const wpRes = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
                title: generatedPost.title,
                content: generatedPost.content,
                status: 'publish' // Make it live
            })
        });

        if (wpRes.ok) {
            const wpData = await wpRes.json();
            wpUrl = wpData.link;
        } else {
             // Let it fail and catch
             throw new Error("WP Publish Failed: " + await wpRes.text());
        }
    } else {
         // Mock WP URL
         wpUrl = `https://mock-wordpress.com/${pauta.id}`;
    }

    // 5. A Confirmação
    await supabase
      .from('pautas')
      .update({ 
         status: 'publicado',
         url_wordpress: wpUrl 
      })
      .eq('id', pauta.id);

    return NextResponse.json({ message: "Successfully published", id: pauta.id, url: wpUrl, skippedWpReason, genTitle: generatedPost.title });

  } catch (err: any) {
    if (err.message && err.message.includes('No pautas to process')) {
       return NextResponse.json({ message: "No pautas to process" });
    }
    
    // If it fails down the line, we might want to revert or mark as error, but we need the ID
    if (currentPautaId) {
        await supabase
          .from('pautas')
          .update({ status: 'erro' })
          .eq('id', currentPautaId);
    }
    
    console.error("Cron error:", err?.message || String(err));
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
