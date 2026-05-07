import { NextResponse } from 'next/server';
import { supabase, type Pauta } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Initialize Gemini if Key is present
  const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (geminiApiKey && geminiApiKey !== "MY_GEMINI_API_KEY") {
      ai = new GoogleGenAI({ apiKey: geminiApiKey });
  }

  // To protect this route from arbitrary calls, we might check an Authorization header.
  // In Vercel, it attaches essentially an Authorization Bearer matching CRON_SECRET.
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')) {
     return NextResponse.json({ message: "Supabase not configured. Mock cron finished." }, { status: 200 });
  }

  let currentPautaId: string | null = null;

  try {
    // 1. A Varredura
    const { data: pautas, error: fetchError } = await supabase
      .from('pautas')
      .select('*')
      .eq('status', 'aguardando')
      .order('data_agendada', { ascending: true })
      .limit(1);

    if (fetchError || !pautas || pautas.length === 0) {
      return NextResponse.json({ message: "No pautas to process." });
    }

    const pauta = pautas[0] as Pauta;
    currentPautaId = pauta.id;

    // 2. A Trava de Segurança
    await supabase
      .from('pautas')
      .update({ status: 'processando' })
      .eq('id', pauta.id);

    // 3. A Geração (Google AI Studio)
    let generatedPost = { title: '', content: '' };
    
    if (ai) {
        try {
            const prompt = `Escreva um post de blog em português, usando termos simples e para leigos, evitando jargões técnicos.
            Tópico: "${pauta.titulo_tema}"
            Retorne APENAS um objeto JSON estritamente com duas chaves: "title" (o título do post do blog) e "content" (uma string com o corpo em HTML com headers, parágrafos e listas).`;

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
    if (process.env.WORDPRESS_URL && !process.env.WORDPRESS_URL.includes('your-wp-site.com')) {
        const auth = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64');
        
        let apiUrl = process.env.WORDPRESS_URL;
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

    return NextResponse.json({ message: "Successfully published", id: pauta.id, url: wpUrl });

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
