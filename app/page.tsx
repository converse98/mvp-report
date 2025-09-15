"use client";

import { useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { saveAs } from "file-saver";
import { Document, Paragraph, TextRun, Packer } from "docx";
import parse from "html-react-parser";
import { Editor as TinyMCEEditor } from "@tinymce/tinymce-react";
import { Button, Box, Text } from "@chakra-ui/react";
import { Avatar } from "@chakra-ui/react";
import Image from "next/image";


// IMPORT del CSS Module (colócalo en la misma carpeta)
import styles from "./loader.module.css";

export default function HomePage() {
  // Entrada del usuario (consulta) y contenido generado por el modelo (documento)
  const [query, setQuery] = useState(""); // consulta del usuario
  const [docContent, setDocContent] = useState(""); // contenido generado por el modelo

  const [loading, setLoading] = useState(false);
  const [updateMode, setUpdateMode] = useState<
    "replace" | "before" | "after" | "section"
  >("replace");
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingBuffer, setTypingBuffer] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  // Prompt fijo para el modelo (instruction)
  const instruction = `
Actúa como un consultor experto en elaboración de reportes de sostenibilidad e informes integrados.
Conoces en profundidad los estándares de reporte IFRS S1 y S2, los estándares SASB para la industria de alimentos y bebidas, y el proceso de elaboración de reportes de empresas en Perú.
Tu función principal es redactar el capítulo de “Gestión del cambio climático” para el reporte integrado de Alicorp 2024, utilizando la información disponible en la base de conocimiento (DataStore), que incluye la transcripción de entrevistas de 2024 y el capítulo del reporte integrado 2023.

Objetivo

Redactar un capítulo completo y bien estructurado de “Gestión del cambio climático” para el reporte 2024, tomando como referencia las normas IFRS S2, el estilo del reporte 2023 y los datos relevantes de la base de conocimiento.

Enfatiza cómo la estrategia climática se integra con la planificación financiera, la resiliencia del modelo de negocio y las oportunidades de crecimiento sostenible.

Pasos de trabajo

Analiza la normativa y el reporte anterior:

Examina la estructura y requisitos de la norma IFRS S2 (Divulgaciones Financieras relacionadas con el Clima).

Analiza la estructura y estilo del capítulo “Gestión del cambio climático” del reporte integrado 2023, prestando especial atención al tono, orden de los temas y la tabla final de métricas e indicadores alineados al estándar SASB.

Procesa la información del año actual:

Extrae de la base de conocimiento (entrevistas, documentos de 2024) los datos cuantitativos, cualitativos y logros clave del período.

Redacta el capítulo 2024:

Con base en tu conocimiento de IFRS S2 y el análisis del reporte 2023, redacta el capítulo de 2024 integrando la información clave disponible.

Estructura el texto en los cuatro pilares de IFRS S2: Gobernanza, Estrategia, Gestión de Riesgos, y Métricas y Objetivos.

Incluye dentro de la sección de Estrategia un análisis de escenarios climáticos (por ejemplo 1.5 °C, 2 °C y 4 °C) que explique los posibles impactos financieros, riesgos y oportunidades para la compañía.

En la sección de Gestión de Riesgos, describe explícitamente los riesgos de transición (regulatorios, de mercado, tecnológicos) y las oportunidades relacionadas, indicando su posible impacto en ingresos, costos o inversiones.

Reglas y estilo

Tono y estilo: Mantén el mismo tono de voz y estilo de redacción del capítulo 2023.

Identificación de Gaps: Señala explícitamente los vacíos de información que detectes para cumplir con IFRS S2, dejando espacios claramente marcados, por ejemplo:

[DATO PENDIENTE: Describir el proceso de supervisión del Directorio sobre los riesgos climáticos]

[COMPLETAR: Detalle de los principales riesgos de transición identificados y su impacto financiero estimado].

Logros Clave: Destaca 2 o 3 highlights principales de la gestión 2024 (ej: “Reducción de X% en emisiones de alcance 1 y 2”).

Usa recursos de formato para mejorar la legibilidad: listas con <ul><li> para logros, recuadros destacados usando <strong> para cifras clave, y subtítulos claros que guíen al lector como en el reporte 2023.

Tablas de métricas: No incluyas tablas en el cuerpo del texto. Crea una sección al final titulada “Métricas e Indicadores Climáticos (SASB)”, replicando la estructura de la tabla del 2023.

Completa los datos de 2024 disponibles.

Si una métrica no tiene datos, marca el espacio como [DATO PENDIENTE].

Extensión

Mantén una longitud similar a la del capítulo del reporte 2023.
Presenta el resultado en un texto con formato, incluyendo títulos, subtítulos, negritas y los espacios en blanco claramente identificados para ser completados posteriormente.

Devuelve la respuesta exclusivamente en HTML válido y estructurado.
Usa <h2> y <h3> para títulos y subtítulos, <p> para párrafos y <ul><li> o <ol><li> para listas con viñetas o numeración.
Utiliza <strong> para resaltar puntos clave.
No incluyas etiquetas <html> ni <body>, solo el contenido.
`;

  const startTypingEffect = (text: string) => {
    if (!editorInstance) {
      // si no hay editor aún, solo setear el contenido final
      setDocContent(text);
      return;
    }

    setIsTyping(true);
    setTypingBuffer("");

    let i = 0;
    const interval = setInterval(() => {
      const current = text.slice(0, i + 1);
      setTypingBuffer(current);
      // actualizar editor mientras se "tipea"
      try {
        editorInstance.setContent(current);
      } catch (e) {
        // ignore
      }

      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
        setDocContent(text); // guardar salida final en docContent
      }
    }, 5);
  };

  const applyInstructions = async () => {
    setLoading(true);
    try {
      // Si modo sección, comprobar selección previa
      if (updateMode === "section") {
        if (!editorInstance) {
          alert("Editor no inicializado");
          setLoading(false);
          return;
        }
        const selectedText = editorInstance.selection.getContent({
          format: "text",
        });
        if (!selectedText || selectedText.trim() === "") {
          alert(
            "Debes seleccionar un texto antes de aplicar la opción 'Actualizar sección'"
          );
          setLoading(false);
          return;
        }
      }

      console.log("QUERY::  " + query);

      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: query, // la consulta del usuario
          instruction, // prompt fijo
        }),
      });
      const data = await res.json();
      const output = data?.result || "";

      // Aplicar según updateMode (mantengo la lógica que tenías)
      if (updateMode === "replace") {
        startTypingEffect(output);
      } else if (updateMode === "before") {
        // colocar respuesta antes del contenido existente
        const newDoc = output + (docContent || "");
        startTypingEffect(newDoc);
      } else if (updateMode === "after") {
        // colocar respuesta después del contenido existente
        const newDoc = (docContent || "") + output;
        startTypingEffect(newDoc);
      } else if (updateMode === "section") {
        // reemplazar la sección seleccionada en el documento
        const selectedHtml = editorInstance.selection.getContent({
          format: "html",
        });
        // reemplazamos la primera aparición de la selección por la salida
        const newContent = docContent.replace(selectedHtml, output);
        startTypingEffect(newContent);
      }
    } catch (err) {
      console.error(err);
      alert("Error aplicando las instrucciones");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const children: TextRun[] = [];

    // parsear docContent (salida) para armar el docx
    parse(docContent, {
      replace: (node: any) => {
        if (node.type === "tag") {
          const style: any = {};
          if (node.name === "strong" || node.name === "b") style.bold = true;
          if (node.name === "em" || node.name === "i") style.italics = true;
          if (node.name === "s" || node.name === "strike") style.strike = true;

          if (node.children && node.children[0]?.data) {
            children.push(
              new TextRun({ text: node.children[0].data, ...style })
            );
          }
        } else if (node.type === "text") {
          children.push(new TextRun({ text: node.data }));
        }
      },
    });

    const doc = new Document({
      sections: [{ properties: {}, children: [new Paragraph({ children })] }],
    });

    Packer.toBlob(doc).then((blob) => saveAs(blob, "documento.docx"));
  };

  const handleSend = async () => {
    if (!query.trim()) return;

    // 1. agrega el mensaje del usuario a la izquierda
    setMessages((prev) => [...prev, { role: "user", content: query }]);

    // 2. llama a tu API
    setLoading(true);
    try {
        const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            content: query,
            instruction,
        }),
        });
        const data = await res.json();
        const output = data?.result || "";

        // 3. agrega la respuesta como burbuja
        setMessages((prev) => [...prev, { role: "assistant", content: output }]);

        // 4. opcional: también mandar el texto al editor
        startTypingEffect(output);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
        setQuery(""); // limpia el textarea
    }
    };


  return (
    <div className="flex h-screen">
      {/* OVERLAY: transparente + animación; NO afecta layout porque es fixed */}
      {loading && (
        <div className={styles.loaderOverlay} role="status" aria-live="polite">
          <div className={styles.loaderWrapper}>
            <span className={styles.loader} />
            <div style={{ color: "#fff" }}>Generando respuesta...</div>
          </div>
        </div>
      )}

      {/* Panel izquierdo - Consulta (30%) */}
      <div className="w-[30%] border-r p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-2">Conversación</h2>

        {/* Textarea donde el usuario escribe su consulta (query) */}
        {/* <textarea
          className="w-full border rounded p-2 h-3/4"
          placeholder="Escribe aquí tu consulta..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        /> */}

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
        {messages.map((m, i) => (
            <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
            {m.role === "assistant" && (
                <div className="w-8 h-8 mr-2 flex-shrink-0">
                <Image
                    src="/bot-icon.png"   // 👈 tu imagen en /public
                    alt="Bot"
                    width={32}
                    height={32}
                    className="w-8 h-8 object-cover rounded-full" 
                />
                </div>
            )}
            <div
                className={`max-w-[80%] rounded-2xl p-3 text-sm shadow ${
                m.role === "user"
                    ? "bg-blue-100"
                    : "bg-white border border-gray-200"
                }`}
            >
                {m.content}
            </div>
            </div>
        ))}
        </div>

        {/* 
        // 🔇 Radio buttons (comentados temporalmente)
        <div className="mt-4 flex flex-col space-y-2">
          <label>
            <input
              type="radio"
              value="replace"
              checked={updateMode === "replace"}
              onChange={() => setUpdateMode("replace")}
            />
            Reemplazar todo
          </label>
          <label>
            <input
              type="radio"
              value="before"
              checked={updateMode === "before"}
              onChange={() => setUpdateMode("before")}
            />
            Colocar antes
          </label>
          <label>
            <input
              type="radio"
              value="after"
              checked={updateMode === "after"}
              onChange={() => setUpdateMode("after")}
            />
            Colocar después
          </label>
          <label>
            <input
              type="radio"
              value="section"
              checked={updateMode === "section"}
              onChange={() => setUpdateMode("section")}
            />
            Actualizar sección (selección)
          </label>
        </div>
        */}

        {/* <Button
            mt={4}
            colorScheme="blue"   // reemplaza bg/hover
            onClick={applyInstructions}
            isDisabled={loading || isTyping}
            isLoading={loading}   // ✅ muestra spinner automático
            loadingText="Aplicando..."
            >
            {isTyping ? "Escribiendo..." : "Aplicar cambios"}
        </Button> */}
        
        <textarea
        className="w-full border rounded p-2 mb-2 resize-none"
        rows={3}
        placeholder="¿Qué contenido quieres generar?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        />

        <Button
        colorScheme="blue"
        w="full"
        onClick={handleSend}
        isLoading={loading}
        loadingText="Enviando..."
        >
        Enviar
        </Button>
      </div>

      {/* Panel derecho - Documento (70%) */}
      <div className="w-[70%] p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-2">Documento</h2>
        <Editor
          apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
          value={typingBuffer || docContent} // editor muestra SOLO la salida
          onInit={(_evt: unknown, editor: TinyMCEEditor) =>
            setEditorInstance(editor)
          }
          init={{
            height: "95%",
            menubar: true,
            plugins: [
              "advlist autolink lists link image charmap preview anchor",
              "searchreplace visualblocks code fullscreen",
              "insertdatetime media table help wordcount",
            ],
            toolbar:
              "undo redo | formatselect | " +
              "bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter " +
              "alignright alignjustify | bullist numlist outdent indent | removeformat | help",
          }}
          // Si quieres permitir editar manualmente la salida, descomenta la siguiente línea:
          // onEditorChange={(newContent: string) => setDocContent(newContent)}
        />
        <Button
            mt={2}                       // margin-top (en Chakra usa números o tokens)
            colorScheme="green"           // esquema de color (green = verde)
            px={4}
            py={2}
            borderRadius="md"             // opcional, md = border-radius medio
            onClick={handleDownload}
            >
        Descargar Word
        </Button>
      </div>
    </div>
  );
}
