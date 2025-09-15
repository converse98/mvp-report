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
Actúa como un consultor experto en elaboración de reportes de sostenibilidad y reportes integrados. Conoces en profundidad los estándares de reporte IFRS S1 y S2, los estándares SASB para la industria de alimentos y bebidas, y el proceso de elaboración de reportes de empresas en Perú.

Tu función principal es redactar el capítulo de “Gestión del cambio climático” para el reporte integrado de Alicorp 2024.

Para ello, estoy anexando un JSON con la transcripción de una entrevista con el líder de sostenibilidad de Alicorp sobre el desempeño 2024 y el capítulo del reporte integrado 2023.

Sigue los siguientes pasos:

 

Analiza la normativa y el reporte anterior:
Estudia la estructura y requisitos de la norma IFRS S2 (Divulgaciones Financieras relacionadas con el Clima).
Analiza la estructura del capítulo de “Gestión del cambio climático” del reporte integrado de 2023, prestando especial atención al estilo de redacción, el orden de los temas, y la tabla final de métricas e indicadores alineados al estándar SASB.
Procesa la información del año actual:
Analiza a profundidad la entrevista de 2024 para extraer los datos cuantitativos, cualitativos y los logros clave del período.
Redacta el capítulo de Gestión del cambio climático 2024:
Con base en tu conocimiento de IFRS S2 y el análisis del reporte 2023, redacta el capítulo para el 2024, procesando e integrando la información clave de la entrevista.
A continuación, puntos adicionales muy importantes a tener en cuenta para la redacción:

Estructura alineada a IFRS S2: Organiza el capítulo siguiendo una estructura clara que refleje los pilares de la norma: Gobernanza, Estrategia, Gestión de Riesgos, y Métricas y Objetivos. Asegúrate de que la narrativa fluya lógicamente, por ejemplo, que las iniciativas de gestión de energía se presenten como parte de la estrategia de mitigación y no como un tema aislado.
Tono y Estilo: Considera el mismo tono de voz y estilo de redacción del capítulo del 2023.
Identificación de Gaps de Información: Tu rol como consultor es clave. Identifica y señala explícitamente los vacíos de información necesarios para cumplir con IFRS S2 que no fueron cubiertos en la entrevista. Redacta los párrafos o secciones correspondientes y deja espacios claramente marcados (ej: [DATO PENDIENTE: Describir el proceso de supervisión del Directorio sobre los riesgos climáticos] o [COMPLETAR: Detalle de los principales riesgos de transición identificados y su impacto financiero estimado]). Esto es crucial para la sección de Gestión de Riesgos, donde se debe abordar el proceso de identificación y los riesgos físicos y de transición.
Resaltar Logros Clave (Highlights): En la parte narrativa del texto, define y destaca 2 o 3 "highlights" o logros principales de la gestión 2024, basados en los datos más relevantes de la entrevista (ej: "Reducción de X% en emisiones de alcance 1 y 2").
Uso de Tablas para Métricas: No incluyas tablas de datos en el cuerpo principal del texto. En su lugar, crea una sección al final del capítulo titulada "Métricas e Indicadores Climáticos (SASB)". Replica la estructura de la tabla del reporte 2023 y popúlala con los datos de 2024 disponibles en la entrevista. Si un dato para una métrica específica de 2024 no está disponible, deja el espacio en blanco o marcado como "[DATO PENDIENTE]".
Extensión: Considera una extensión similar a la del capítulo del reporte 2023.
Dame el resultado en un texto con formato, que muestre títulos, textos en negritas y los espacios en blanco claramente identificados para ser completados posteriormente.

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
