import { NextResponse } from "next/server";
import { DocumentServiceClient } from "@google-cloud/discoveryengine";

export async function GET() {
  try {
    // Configurar el cliente para apuntar a la región 'us'
    const client = new DocumentServiceClient({
      apiEndpoint: "us-discoveryengine.googleapis.com",
    });

    const parent = `projects/694128417896/locations/us/collections/default_collection/dataStores/docs-mvp-2025_1757526500648_gcs_store/branches/0`;

    console.log("🔍 Listando documentos desde:", parent);

    const [documents] = await client.listDocuments({ 
      parent,
      pageSize: 100 // Limitar para evitar respuestas muy grandes
    });

    console.log("📄 Documentos encontrados:", documents?.length || 0);

    if (!documents || documents.length === 0) {
      return NextResponse.json({ 
        message: "No se encontraron documentos",
        documents: [] 
      });
    }

    const docsInfo = documents.map((doc: any, index: number) => {
      console.log(`\n--- Documento ${index + 1} ---`);
      console.log("Estructura completa del documento:", JSON.stringify(doc, null, 2));

      // Extraer información básica del documento
      const docInfo: any = {
        id: doc.id || doc.name?.split('/').pop() || `doc-${index}`,
        name: doc.name || "Sin nombre",
        
        // Información del contenido
        content: {
          hasContent: !!doc.content,
          contentSize: doc.content?.length || 0,
          mimeType: doc.content?.mimeType || "unknown"
        },

        // Información de derivedStructData (metadatos procesados)
        structData: null,
        
        // Información de chunks (si existen)
        chunks: {
          hasChunks: false,
          chunkCount: 0,
          chunkInfo: []
        },

        // Estado del documento
        state: doc.state || "UNKNOWN",
        
        // Errores si los hay
        errors: doc.error ? [doc.error] : []
      };

      // Procesar derivedStructData si existe
      if (doc.derivedStructData) {
        const fields = doc.derivedStructData.fields || {};
        docInfo.structData = {
          title: fields.title?.stringValue || fields.title?.value || "Sin título",
          link: fields.link?.stringValue || fields.link?.value || "",
          extractedText: fields.extractedText?.stringValue?.substring(0, 200) + "..." || "",
          pageCount: fields.pageCount?.numberValue || fields.pageCount?.value || 0,
          // Agregar otros campos que puedan existir
          allFields: Object.keys(fields)
        };
      }

      // Procesar información de chunks si existe
      if (doc.chunks && Array.isArray(doc.chunks)) {
        docInfo.chunks = {
          hasChunks: true,
          chunkCount: doc.chunks.length,
          chunkInfo: doc.chunks.slice(0, 3).map((chunk: any, chunkIndex: number) => ({
            id: chunk.id || `chunk-${chunkIndex}`,
            pageSpan: chunk.pageSpan || null,
            content: chunk.content?.substring(0, 150) + "..." || "Sin contenido",
            relevanceScore: chunk.relevanceScore || null
          }))
        };
      }

      return docInfo;
    });

    // Estadísticas generales
    const stats = {
      totalDocuments: documents.length,
      documentsWithContent: docsInfo.filter(doc => doc.content.hasContent).length,
      documentsWithChunks: docsInfo.filter(doc => doc.chunks.hasChunks).length,
      documentsWithErrors: docsInfo.filter(doc => doc.errors.length > 0).length,
      totalChunks: docsInfo.reduce((sum, doc) => sum + doc.chunks.chunkCount, 0)
    };

    console.log("📊 Estadísticas:", stats);

    return NextResponse.json({ 
      stats,
      documents: docsInfo 
    });

  } catch (err: any) {
    console.error("❌ Error listando documentos:", err);
    console.error("Stack trace:", err.stack);
    
    return NextResponse.json(
      { 
        error: err.message || "Error inesperado",
        code: err.code || "UNKNOWN_ERROR",
        details: err.details || null
      },
      { status: 500 }
    );
  }
}

// Función auxiliar para obtener un documento específico con más detalle
export async function getDocumentDetails(documentId: string) {
  try {
    const client = new DocumentServiceClient({
      apiEndpoint: "us-discoveryengine.googleapis.com",
    });

    const name = `projects/crm-inteligenze/locations/us/collections/default_collection/dataStores/docs-mvp-2025_1757526500648_gcs_store/branches/0/documents/${documentId}`;

    const [document] = await client.getDocument({ name });

    console.log("📄 Detalle completo del documento:", JSON.stringify(document, null, 2));

    return document;

  } catch (err: any) {
    console.error("❌ Error obteniendo documento:", err);
    throw err;
  }
}