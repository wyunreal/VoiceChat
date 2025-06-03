// app/api/transcribe/route.js
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio");

    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "No audio file received" }), {
        status: 400,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const apiFormData = new FormData();
    apiFormData.append("file", new Blob([buffer]), file.name);
    apiFormData.append("model", "whisper-1");

    const openaiRes = await fetch(`${process.env.OPENAI_WHISPER_API_URL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_WHISPER_API_KEY}`,
      },
      body: apiFormData,
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 500 });
    }
    return new Response(JSON.stringify({ text: data.text }), { status: 200 });
  } catch (err: unknown) {
    console.error(err);
    return new Response(JSON.stringify({ error: err }), {
      status: 500,
    });
  }
}
