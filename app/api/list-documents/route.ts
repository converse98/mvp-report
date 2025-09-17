import { NextResponse } from "next/server";
import { DocumentServiceClient } from "@google-cloud/discoveryengine";

export async function GET() {
  try {
    // 🔑 Autenticación igual que en tu otro endpoint
    const googleAuthOptions = {
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}"),
    };

    const client = new DocumentServiceClient({
      apiEndpoint: "us-discoveryengine.googleapis.com",
      ...googleAuthOptions, // ✅ Igual que en SearchServiceClient
    });

    const parent = `projects/694128417896/locations/us/collections/default_collection/dataStores/docs-mvp-2025_1757526500648_gcs_store/branches/0`;

    // 📋 Lista documentos (máx. 50 por llamada)
    const [documents] = await client.listDocuments({ parent, pageSize: 50 });

    return NextResponse.json({
      total: documents.length,
      documents
    });
  } catch (err: any) {
    console.error("Error al listar documentos:", err);
    return NextResponse.json(
      {
        error: err.message || "Error interno al listar documentos",
        code: err.code || "UNKNOWN_ERROR",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
