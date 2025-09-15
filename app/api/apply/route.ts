import { NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { SearchServiceClient } from "@google-cloud/discoveryengine";

export async function POST(req: Request) {
  const { content, instruction } = await req.json();

  try {
    // 1. Inicializar clientes
    const googleAuthOptions = {
    credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}"),
    };

    // ✅ Cliente de Discovery Engine
    const searchClient = new SearchServiceClient({
    apiEndpoint: "us-discoveryengine.googleapis.com",
    ...googleAuthOptions, // DiscoveryEngine sí acepta credentials directo
    });

    // ✅ Cliente de Vertex AI
    const vertexAI = new VertexAI({
    project: process.env.GOOGLE_PROJECT_ID!,
    location: process.env.GOOGLE_LOCATION || "us-central1",
    googleAuthOptions, // Vertex AI requiere googleAuthOptions
    });

    console.log("Instruction: " + instruction);
    console.log("Content: " + content);

    // 2. Buscar información relevante en el datastore
    const searchQuery = `${instruction} ${content}`.slice(0, 500);

    console.log("🔎 Ejecutando búsqueda en DataStore con query:", searchQuery);

    // CAMBIO PRINCIPAL: Usar el path correcto con default_collection y servingConfig correcto
    const searchRequest = {
      //servingConfig: `projects/694128417896/locations/us/collections/default_collection/dataStores/docs-mvp-2025_1757526500648_gcs_store/servingConfigs/default_serving_config`,
      servingConfig:  `projects/694128417896/locations/us/collections/default_collection/engines/app-mvp-2025_1757560889293/servingConfigs/default_config`,
      query: searchQuery,
      pageSize: 5,
    };

    const [searchResults] = await searchClient.search(searchRequest);

    console.log("📂 Resultados brutos del DataStore:", JSON.stringify(searchResults, null, 2));

    if (!searchResults || searchResults.length === 0) {
      console.warn("⚠️ No se encontraron resultados en el DataStore");
    } else {
      console.log(`✅ Se encontraron ${searchResults.length} resultados`);
      console.log("RESULTADO::: " + JSON.stringify(searchResults[0]));
    }

    // 3. Extraer contexto (mejorado para manejar diferentes estructuras)
    const context = searchResults
    .map((result, index) => {
        const fields = result.document?.derivedStructData?.fields || {};
        
        const title = fields?.title?.stringValue || `Documento ${index + 1}`;
        const link = fields?.link?.stringValue || "";
        
        // NUEVO: Extraer extractive_answers
        const extractiveAnswers = fields?.extractive_answers?.listValue?.values || [];
        const content = extractiveAnswers
        .map(answer => {
            const answerFields = answer?.structValue?.fields || {};
            const pageNum = answerFields?.pageNumber?.stringValue || "";
            const text = answerFields?.content?.stringValue || "";
            return pageNum ? `[Página ${pageNum}] ${text}` : text;
        })
        .join('\n');

        return content 
        ? `**${title}:**\n${content}\n${link ? `Fuente: ${link}` : ""}`
        : `**${title}:**\nDocumento disponible en: ${link}`;
    })
    .filter(Boolean)
    .join("\n\n");

    // 4. Configurar modelo generativo
    const generativeModel = vertexAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.1,
        topP: 0.95,
      },
    });

    // 5. Construir prompt
    const enhancedPrompt = context
      ? `${instruction}

Contexto relevante de la base de conocimientos:
${context}

Texto original:
${content}

👉 Usa la información del contexto proporcionado para complementar tu respuesta.`
      : `${instruction}

Texto original:
${content}

👉 No se encontró información adicional relevante en la base de conocimientos.`;

    // 6. Llamar al modelo
    const resp = await generativeModel.generateContent({
      contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
    });

    const output =
      resp.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ No hubo salida";

    // 7. Devolver resultados (mejorado)
    const sources = searchResults.map((result) => {
      const structData = result.document?.derivedStructData;
      const fields = structData?.fields || {};
      
      return {
        title: 
          fields?.title?.stringValue || 
          (fields?.title as any)?.value || 
          (structData as any)?.title || 
          "Sin título",
        link: 
          fields?.link?.stringValue || 
          fields?.uri?.stringValue ||
          (structData as any)?.link || 
          "",
        snippet: 
          (fields?.extractedText?.stringValue || "").substring(0, 200) ||
          (fields?.content?.stringValue || "").substring(0, 200) ||
          (structData as any)?.snippets?.[0]?.snippet ||
          ((result.document as any)?.content || "").substring(0, 200) ||
          "",
      };
    });

    console.log(">>>>>>>> " + output);

    return NextResponse.json({
      result: output,
      sources: sources.length > 0 ? sources : undefined,
      contextUsed: !!context,
      debug: {
        searchQuery,
        foundResults: searchResults.length,
        contextLength: context.length
      }
    });
  } catch (err: any) {
    console.error("Vertex AI error:", err);
    console.error("Error stack:", err.stack);
    
    return NextResponse.json(
      {
        error: err.message || "Error inesperado en el servidor",
        code: err.code || "UNKNOWN_ERROR",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}