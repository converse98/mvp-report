import { useState } from "react";

type SubCardProps = {
  comp: { title: string; detail: string };
  onClick: (detail: string, title: string) => void;
  isDisabled: boolean;
  onToggle: () => void;
};

export function SubCard({ comp, onClick, isDisabled, onToggle }: SubCardProps) {
  return (
    <div
      className={`relative p-3 rounded-lg border transition duration-200
        ${isDisabled
          ? "border-red-300 bg-red-50 opacity-60"
          : "border-green-200 bg-green-50 hover:bg-green-100 hover:shadow-md"}`}
    >
      {/* Switch arriba a la derecha */}
      <label className="absolute top-2 right-2 flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={!isDisabled}
          onChange={onToggle}
        />
        <div
          className={`w-10 h-5 rounded-full p-1 transition-colors
            ${isDisabled ? "bg-red-400" : "bg-green-400"}`}
        >
          <div
            className={`bg-white w-4 h-4 rounded-full shadow transform duration-200
              ${isDisabled ? "translate-x-0" : "translate-x-5"}`}
          />
        </div>
      </label>

      {/* Contenido clickeable */}
      <button
        onClick={() => onClick(comp.detail, comp.title)}
        className="w-full text-left focus:outline-none"
      >
        <p className="font-medium">{comp.title}</p>
        <p className="text-sm">Clickea aquí para visualizar el contenido.</p>
      </button>
    </div>
  );
}

