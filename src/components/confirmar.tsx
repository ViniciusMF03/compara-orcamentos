"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** Pede confirmação antes de uma ação destrutiva. */
export function Confirmar({
  titulo,
  descricao,
  textoConfirmar = "Apagar",
  onConfirmar,
  children,
}: {
  titulo: string;
  descricao: React.ReactNode;
  textoConfirmar?: string;
  onConfirmar: () => unknown;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{titulo}</AlertDialogTitle>
        <AlertDialogDescription>{descricao}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onConfirmar()}>{textoConfirmar}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
