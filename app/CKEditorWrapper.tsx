// app/CKEditorWrapper.tsx (o el path que uses)
"use client";

import dynamic from "next/dynamic";
import React from "react";

const CKEditor = dynamic(
  async () => {
    const mod = await import("@ckeditor/ckeditor5-react");
    const ClassicEditor = (await import("@ckeditor/ckeditor5-build-classic")).default;
    return function CKEditorWithBuild(props: any) {
      return <mod.CKEditor editor={ClassicEditor} {...props} />;
    };
  },
  { ssr: false }
);

interface Props {
  data: string;
  disabled?: boolean;
  onChange: (data: string) => void;
  className?: string;
  config?: Record<string, any>;
}

export default function CKEditorWrapper({
  data,
  disabled,
  onChange,
  className
}: Props) {
  return (
    <div className={className ?? ""} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <CKEditor
        data={data}
        disabled={disabled}
        onChange={(_: unknown, editor: any) => {
          onChange(editor.getData());
        }}
      />
    </div>
  );
}
