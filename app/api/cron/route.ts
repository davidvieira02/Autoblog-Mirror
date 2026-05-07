import { NextResponse } from 'next/server';
import { supabase, type Pauta } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini if Key is present
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
    // In actual AI Studio environments, the env var is accessed via process.env.GEMINI_API_KEY globally or NEXT_PUBLIC_GEMINI_API_KEY for client
    ai = new GoogleGenAI({ apiKey: geminiApiKey });
}

export async function GET(request: Request) {
  // To protect this route from arbitrary calls, we might check an Authorization header.
  // In Vercel, it attaches essentially an Authorization Bearer matching CRON_SECRET.
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')) {
     return NextResponse.json({ message: "Supabase not configured. Mock cron finished." }, { status: 200 });
  }

  try {
    // 1. A Varredura
    const { data: pautas, error: fetchError } = await supabase
      .from('pautas')
      .select('*')
      .eq('status', 'aguardando')
      .lte('data_agendada', new Date().toISOString())
      .limit(1);

    if (fetchError || !pautas || pautas.length === 0) {
      return NextResponse.json({ message: "No pautas to process." });
    }

    const pauta = pautas[0] as Pauta;

    // 2. A Trava de Segurança
    await supabase
      .from('pautas')
      .update({ status: 'processando' })
      .eq('id', pauta.id);

    // 3. A Geração (Google AI Studio)
    let generatedPost = { title: '', content: '' };
    
    if (ai) {
        const prompt = `Write a blog post in simple terms for laypeople avoiding technical jargon. 
        Topic: "${pauta.titulo_tema}"
        Output as JSON object strictly with two keys: "title" (the blog post title) and "content" (HTML body string with headers, paragraphs, and lists).`;

        const response = await ai.models.generateContent({
           model: 'gemini-2.5-flash', // We use standard text Gen model. In real app, might want 2.5 flash or pro
           contents: prompt,
        });

        const responseText = response.text || '';
        try {
            // Find JSON in response
            const jsonStrMatch = responseText.match(/\\{[\s\S]*\\}/);
            if (jsonStrMatch) {
                generatedPost = JSON.parse(jsonStrMatch[0]);
            }
        } catch (e) {
            console.error("Failed to parse Gemini response", e);
        }
    } else {
        // Fallback or mock if no AI configured
        generatedPost = {
            title: `Explicando: ${pauta.titulo_tema}`,
            content: `<h1>${pauta.titulo_tema}</h1><p>Conteúdo gerado automaticamente para explicar sobre este tema para leigos...</p>`
        }
    }

    if (!generatedPost.title || !generatedPost.content) {
        throw new Error("Generation failed getting valid output.");
    }

    // 4. A Publicação (WordPress)
    let wpUrl = "";
    if (process.env.WORDPRESS_URL && !process.env.WORDPRESS_URL.includes('your-wp-site.com')) {
        const auth = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64');
        const wpRes = await fetch(`${process.env.WORDPRESS_URL}/wp-json/wp/v2/posts`, {
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
    console.error("Cron error:", err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
