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
          const suggestionPrompt = `Você é um estrategista de conteúdo focado em SEO, Google News e aprovação no Google AdSense para o site "Onde Eu Clico" (ondeeuclico.com.br).
          Seu nicho é: Tecnologia Avançada, Inteligência Artificial, Inovações Tecnológicas e Análise de Tendências.
          
          Gere UMA sugestão de pauta (título de artigo) inédita, aprofundada, técnica e focada em novidades impactantes ou análises complexas sobre IA e tecnologia. 
          O tema deve permitir um artigo rico, com alto nível técnico, detalhado e embasado (E-E-A-T).
          
          Exemplos de temas profundos: 
          - "A evolução dos modelos fundacionais: Como a arquitetura Transformer está sendo superada"
          - "Análise profunda: O impacto da nova IA do Google no desenvolvimento de software empresarial"
          - "Além dos LLMs: Como redes neurais líquidas prometem revolucionar sistemas robóticos autônomos"
          
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
            const prompt = `Você é um analista sênior de tecnologia e inteligência artificial. 
            Você escreve para o portal "Onde Eu Clico", focado em notícias de tecnologia de ponta, análises de mercado e inovações disruptivas. 
            Seu objetivo é criar conteúdo original, extremamente aprofundado, técnico e de altíssima qualidade (foco total em E-E-A-T - Experiência, Especialidade, Autoridade e Confiabilidade - para aprovação no Google AdSense e ranqueamento no Google News).
            
            Escreva um artigo de opinião ou análise técnica profunda e completa para a pauta: "${pauta.titulo_tema}".
            
            DIRETRIZES DE CONTEÚDO (Nível Especialista):
            1. Inicie com um gancho forte (lead jornalístico) contextualizando o impacto do tema no mercado atual, na ciência ou na indústria de software.
            2. Não faça textos superficiais. O artigo deve ser muito denso, rico em dados, exemplos de arquiteturas, casos de uso reais e análises críticas (idealmente +800 palavras). Explore os "comos", "porquês" e os impactos futuros.
            3. Visão Crítica e Desafios: Inclua os desafios técnicos, éticos ou de implementação, limitações da tecnologia atual e o que esperar dos próximos 2 a 5 anos.
            4. Linguagem Técnica e Profissional: Use vocabulário técnico correto, jargões da área (explicando apenas brevemente se for algo muito nichado) e tom acadêmico/jornalístico.
            
            REGRAS DE FORMATAÇÃO HTML (Obrigatório para WordPress):
            - Retorne apenas o HTML do miolo. Não use <h1>.
            - Use <h2> e <h3> para estruturar o artigo em seções bem definidas (ex: Contexto, Arquitetura, Impacto, Desafios, Conclusão).
            - Use <p> para parágrafos.
            - Use <ul> ou <ol> para enumerar benefícios, características técnicas ou pontos-chave.
            - Use <blockquote> para citações relevantes ou destaques críticos.
            - NUNCA use markdown como \`\`\`html no retorno.

            Retorne APENAS um objeto JSON válido com as exatas chaves: "title" (o título otimizado para SEO e chamativo) e "content" (todo o corpo do texto do artigo formatado em HTML).`;

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
