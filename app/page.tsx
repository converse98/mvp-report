    "use client";

    import { useEffect, useRef, useState } from "react";
    import { Editor } from "@tinymce/tinymce-react";
    import { saveAs } from "file-saver";
    import { Document, Paragraph, TextRun, Packer } from "docx";
    import parse from "html-react-parser";
    import { Editor as TinyMCEEditor } from "@tinymce/tinymce-react";
    import { Button, Box, Text } from "@chakra-ui/react";
    import { Avatar } from "@chakra-ui/react";
    import Image from "next/image";
    import { v4 as uuidv4 } from "uuid"; // ⬅️ arriba del archivo
    import { CKEditor } from '@ckeditor/ckeditor5-react';
    import ClassicEditor from '@ckeditor/ckeditor5-build-classic';


    // IMPORT del CSS Module (colócalo en la misma carpeta)
    import styles from "./loader.module.css";
import { SubCard } from "./SubCard";
import CKEditorWrapper from "./CKEditorWrapper";

    export default function HomePage() {
    // Entrada del usuario (consulta) y contenido generado por el modelo (documento)
    const [query, setQuery] = useState(""); // consulta del usuario
    const [docContent, setDocContent] = useState(""); // contenido generado por el modelo

    // Guarda el contenido final editado de cada subcard
    const [chapterContents, setChapterContents] = useState<Record<string, string>>({});

    const [loading, setLoading] = useState(false);
    const [updateMode, setUpdateMode] = useState<
        "replace" | "before" | "after" | "section"
    >("replace");
    const [editorInstance, setEditorInstance] = useState<any>(null);
    // Identifica cuál subcard está activa
    const [currentChapterKey, setCurrentChapterKey] = useState<string>("");
    const [isTyping, setIsTyping] = useState(false);
    const [typedChapters, setTypedChapters] = useState<string[]>([]);
    const [typingBuffer, setTypingBuffer] = useState("");
    const typingInterval = useRef<NodeJS.Timeout | null>(null); // ✅ NUEVO: para guardar el intervalo activo
   type BotContent = {
    introduction: string;
    components: { title: string; detail: string }[];
    };

    type UserMessage = {
    id: string;                    // ✅ nuevo
    role: "user";
    content: string;
    };

    type BotMessage = {
    id: string;                    // ✅ nuevo
    role: "assistant";
    content: BotContent;
    };

    type Message = UserMessage | BotMessage; // ✅ NUEVO
    const [messages, setMessages] = useState<Message[]>([]);

    const [disabledByMsg, setDisabledByMsg] = useState<Record<string, string[]>>({});

    // 🟥 Lista con títulos + contenido de los desactivados
    const disabledComponents = messages.flatMap((m) =>
    m.role === "assistant" && m.content?.components
        ? m.content.components.filter((c) =>
            (disabledByMsg[m.id] || []).includes(c.title)
        )
        : []
    );


    /* const handleChapterClick = (detail: string) => {
        // Usa tu misma función de tipeo
        startTypingEffect(detail);
    }; */

    const startHtmlTypingEffect = (html: string) => {
        if (typingInterval.current) clearInterval(typingInterval.current);

        // 1. Tokenizamos en tags o texto
        const tokens = html.match(/<\/?[^>]+>|[^<]+/g) || [];

        let tokenIndex = 0;     // índice de token actual
        let charIndex  = 0;     // índice dentro del token
        let currentOutput = "";

        setIsTyping(true);
        setTypingBuffer("");

        const interval = setInterval(() => {
            if (tokenIndex >= tokens.length) {
            clearInterval(interval);
            typingInterval.current = null;
            setIsTyping(false);
            setDocContent(html);         // ✅ Al final, HTML completo
            return;
            }

            const token = tokens[tokenIndex];

            if (token.startsWith("<")) {
            // 👉 Si es TAG, lo ponemos de golpe (no lo partimos)
            currentOutput += token;
            tokenIndex++;
            charIndex = 0;
            } else {
            // 👉 Si es TEXTO, lo vamos mostrando carácter a carácter
            currentOutput += token[charIndex];
            charIndex++;
            if (charIndex >= token.length) {
                tokenIndex++;
                charIndex = 0;
            }
            }

            setTypingBuffer(currentOutput);
        }, 2); // ⚡ velocidad de tipeo (ms por paso)

        typingInterval.current = interval;
    };

    
    const handleChapterClick = (detail: string, title: string) => {
    // 🔑 Usamos el title como identificador único
    const chapterKey = title || detail.slice(0, 20); // fallback si no hay title
    setCurrentChapterKey(chapterKey);

    // Si ya guardamos edición previa -> mostrar eso (sin tipeo)
    if (chapterContents[chapterKey]) {
        setIsTyping(false);
        setTypingBuffer("");
        setDocContent(chapterContents[chapterKey]);
        return;
    }

    // Si ya se tipeó antes -> mostrar HTML final directo
    if (typedChapters.includes(chapterKey)) {
        setIsTyping(false);
        setTypingBuffer("");
        setDocContent(detail);
        return;
    }

    // STOP cualquier tipeo previo
    if (typingInterval.current) {
        clearInterval(typingInterval.current);
        typingInterval.current = null;
    }

    // PREPARAR contenido plano para el tipeo (evitamos romper HTML)
    const fullHtml = detail || "";
    // Extraemos texto plano (eliminando tags) y normalizamos espacios
    const plainText = fullHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    // Si no hay texto para tipear, asignamos HTML final directamente
    if (!plainText) {
        setDocContent(fullHtml);
        setChapterContents((prev) => ({ ...prev, [chapterKey]: fullHtml }));
        setTypedChapters((prev) => [...prev, chapterKey]);
        return;
    }

    // INICIAR tipeo sobre texto plano
    setIsTyping(true);
    setTypingBuffer("");
    setDocContent(""); // limpiar editor por seguridad
    setTypedChapters((prev) => [...prev, chapterKey]);

    startHtmlTypingEffect(detail); // 👈 NUEVO: tipeo con formato
    };



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

    Instrucciones importantes a considerar sobre la redacción:
    - Narrativo y estratégico, similar a un informe de sostenibilidad de alta dirección.
    - Párrafos de 4–6 líneas, con transiciones suaves.
    - Mezcla de análisis (interpretación de datos) y visión de futuro.
    - Uso de verbos de acción, por ejemplo: “fortaleció”, “implementó”, “consolidó”, etc. (puedes usar más pero que compartan el mismo fin)
    - Mantener tono positivo pero realista; evitar lenguaje publicitario o técnico en exceso.
    - Incluir subtítulos o apartados temáticos cuando sea natural.
    - No incluyas referencias a “entrevista” o a los nombres de los documentos fuente.
    - Reescribe con tus propias palabras cada idea proveniente de la entrevista

    Devuelve la respuesta exclusivamente en HTML válido y estructurado.
    Usa <h2> y <h3> para títulos y subtítulos, <p> para párrafos y <ul><li> o <ol><li> para listas con viñetas o numeración.
    Utiliza <strong> para resaltar puntos clave.
    No incluyas etiquetas <html> ni <body>, solo el contenido.

    Importante: Cuando generes el reporte, el formato de respuesta que debes devolver será un JSON. Ejemplo:
    {
        "introduction":"texto introductorio",
        "components": [
            {
                "title": "Sección 01",
                "detail": "detalle Sección 01"
            },
            {
                "title": "Sección 02",
                "detail": "detalle Sección 02"
            },
            {
                "title": "Sección N",
                "detail": "detalle Sección N"
            },
            ...
        ]
    }

    El campo introduction, seguirá las siguientes reglas:
    IMPORTANTE:
    - El campo introduction **debe** describir explícitamente la petición del usuario, 
    detallando el tipo de cambio, sección o formato solicitado.
    - No uses introducciones genéricas. 
    - Aunque la petición sea pequeña, el introduction debe reflejarla.
    Donde components tendrá la cantidad de secciones del reporte, en caso se pida todo el reporte las secciones a considerar son las ya mencionadas previamente, en total 4: Gobernanza, Estrategia, Gestión de Riesgos, y Métricas y Objetivos (Considerar solo esas 4 opciones, no se puede tener otra sección en title)
    Y en caso no se pida todo el reporte solo una sección, considerar solo la sección mencionada.
    En el campo title debe contener el nombre de la sección, y en el campo detail, el contenido que se genera por esa sección, en formato HTML como ya se mencionó previamete. 
    `;

    const startTypingEffect = (text: string) => {
    if (typingInterval.current) clearInterval(typingInterval.current);

    // Convertimos a texto plano para no romper HTML
    const plainText = (text || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!plainText) {
        setDocContent(text);
        return;
    }

    setIsTyping(true);
    let i = 0;
    let buffer = "";

    const interval = setInterval(() => {
        if (i < plainText.length) {
        buffer += plainText[i];
        setTypingBuffer(`<p>${buffer}</p>`);
        i++;
        } else {
        clearInterval(interval);
        typingInterval.current = null;
        setIsTyping(false);
        setDocContent(text); // al final ponemos el HTML original (si lo hay)
        }
    }, 3);

    typingInterval.current = interval;
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

        // 👉 1. Unir SOLO los detalles (sin introduction)
        const fullHtml = messages
        .filter((m) => m.role === "assistant")
        .map((m) => {
            const c = m.content as BotContent;
            // 🔑 Solo concatenar los componentes (detalle)
            const comps = c.components
                .map((comp) => comp.detail)   // 👈 SOLO detail, sin repetir títulos
                .join("<br/><br/>");
            return comps;
        })
        .join("<br/><br/>");

        // 👉 2. Parsear el HTML combinado
        parse(fullHtml, {
            replace: (node: any) => {
                if (node.type === "tag") {
                    const style: any = {};

                    if (node.name === "strong" || node.name === "b") style.bold = true;
                    if (node.name === "em" || node.name === "i") style.italics = true;
                    if (node.name === "s" || node.name === "strike") style.strike = true;

                    // Si el contenido ya trae <h1>, <h2>, etc. lo respetamos
                    if (/^h[1-6]$/.test(node.name) && node.children?.[0]?.data) {
                        children.push(
                            new TextRun({
                                text: node.children[0].data,
                                bold: true,
                                size: 28,
                                break: 2,
                            })
                        );
                        return;
                    }

                    if (node.children && node.children[0]?.data) {
                        children.push(
                            new TextRun({
                                text: node.children[0].data,
                                ...style,
                            })
                        );
                    }
                } else if (node.type === "text") {
                    children.push(new TextRun({ text: node.data }));
                }
            },
        });

        // 👉 3. Crear documento Word
        const doc = new Document({
            sections: [{ properties: {}, children: [new Paragraph({ children })] }],
        });

        // 👉 4. Descargar
        Packer.toBlob(doc).then((blob) => saveAs(blob, "documento.docx"));
    };




    const handleSend = async () => {
        console.log("Subcards desactivados:", disabledComponents);
        if (!query.trim()) return;

        // 🔹 1. Limpiar el editor y el efecto de tipeo
        setDocContent("");       // ✅ Limpia el contenido del editor
        setTypingBuffer("");     // ✅ Limpia el buffer de escritura
        setIsTyping(false);      // ✅ Por si había un efecto de tipeo activo

         // 1️⃣ Filtrar títulos únicos en disabledComponents
        const disabledTitles = Array.from(
            new Set(disabledComponents.map((c: { title: string }) => c.title))
        );

        // 2️⃣ Construir el texto extra SOLO si hay elementos
        const extraInstruction =
            disabledTitles.length > 0
            ? ` IMPORTANTE: no realices cambios sobre las siguientes secciones: ${disabledTitles.join(", ")}`
            : "";

        // 3️⃣ Concatenar a la query original
        const finalQuery = query + extraInstruction;

        // 1. agrega el mensaje del usuario a la izquierda
        setMessages((prev) => [
        ...prev,
        {
            id: uuidv4(),       // ✅ identificador único
            role: "user",
            content: finalQuery
        }
        ]);

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
            setMessages((prev) => [
            ...prev,
            {
                id: uuidv4(),                     // 🔑 ID único por interacción
                role: "assistant",
                content: output                    // output es el JSON { introduction, components }
            }
            ]);

            // 4. opcional: también mandar el texto al editor
            startTypingEffect(output);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setQuery(""); // limpia el textarea
        }
        };

        useEffect(() => {
        return () => {
        if (typingInterval.current) {
            clearInterval(typingInterval.current);
        }
        };
    }, []);


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
                className={`flex mb-6 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
                {m.role === "assistant" && (
                <div className="w-8 h-8 mr-2 flex-shrink-0">
                    <Image
                    src="/bot-icon.png"
                    alt="Bot"
                    width={32}
                    height={32}
                    className="w-8 h-8 object-cover rounded-full"
                    />
                </div>
                )}

                <div
                className={`max-w-[80%] p-4 text-sm shadow-md
                    ${m.role === "user"
                    ? "bg-[#e4ebe4] rounded-2xl"
                    : "bg-white border border-gray-200 rounded-2xl"
                    }`}
                >
                {m.role === "user" && (
                    // ✅ Usuario (sin cambios)
                    m.content
                )}

                {m.role === "assistant" && (
                    <>
                    {/* ✅ Card 1: texto de introducción */}
                    <div className="mb-4 p-4 rounded-xl bg-gray-50 border">
                        <p className="text-gray-700">
                        {parse(m.content.introduction)}
                        </p>
                    </div>

                    {/* ✅ Card 2: sub-cards generados dinámicamente */}
                    <div className="p-4 rounded-xl bg-gray-50 border">
                        <h3 className="font-semibold mb-3">
                        Crear módulos de reporte de sostenibilidad
                        </h3>

                        <div className="space-y-3">
                        <div className="space-y-3">
                        {m.content.components?.map((comp: any, idx: number) => (
                        <SubCard
                            key={`${m.id}-${idx}`}          // clave única por interacción
                            comp={comp}
                            onClick={handleChapterClick}
                            isDisabled={disabledByMsg[m.id]?.includes(comp.title) || false}
                            onToggle={() => {
                            setDisabledByMsg((prev) => {
                                const current = prev[m.id] || [];
                                return {
                                ...prev,
                                [m.id]: current.includes(comp.title)
                                    ? current.filter((t) => t !== comp.title)
                                    : [...current, comp.title]
                                };
                            });
                            }}
                        />
                        ))}

                        </div>


                        </div>
                    </div>
                    </>
                )}
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
        <div className="w-[70%] p-4 flex flex-col h-full">  {/* h-full porque el padre es h-screen */}
        <h2 className="text-xl font-bold mb-2">Documento</h2>

        <div className="flex flex-col h-[calc(100vh-60px)]">   {/* IMPORTANTE: min-h-0 para que el hijo pueda hacer overflow interno */}
            <CKEditorWrapper
            data={isTyping ? typingBuffer : docContent}
            disabled={isTyping}
            className="h-full"   // hace que el wrapper ocupe todo el espacio disponible
            onChange={(html) => {
                setDocContent(html);
                setChapterContents((prev) => ({ ...prev, [currentChapterKey]: html }));
            }}
            />
        </div>

        <Button mt={2} colorScheme="green" px={4} py={2} borderRadius="md" onClick={handleDownload}>
            Descargar Word
        </Button>
        </div>
        </div>
    );
    }
