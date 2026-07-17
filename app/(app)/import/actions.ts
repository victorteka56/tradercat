"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { clearImportedData, importRobinhoodCsv } from "@/lib/import/pipeline";

export interface ImportState {
  error?: string;
  result?: {
    fillsInserted: number;
    duplicatesSkipped: number;
    rowErrors: number;
    tradesUpserted: number;
    totalRows: number;
  };
}

const MAX_BYTES = 15 * 1024 * 1024;

export async function importCsv(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to import." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That file is larger than 15 MB." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { error: "Only .csv files are supported right now." };
  }

  try {
    const text = await file.text();
    const outcome = await importRobinhoodCsv(user.id, file.name, text);

    revalidatePath("/journal");
    revalidatePath("/import");
    revalidatePath("/home");

    return {
      result: {
        fillsInserted: outcome.fillsInserted,
        duplicatesSkipped: outcome.duplicatesSkipped,
        rowErrors: outcome.rowErrors,
        tradesUpserted: outcome.tradesUpserted,
        totalRows: outcome.totalRows,
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not read that file. Is it a Robinhood activity export?",
    };
  }
}

export async function clearImports() {
  const user = await requireUser();
  await clearImportedData(user.id);
  revalidatePath("/journal");
  revalidatePath("/import");
  revalidatePath("/home");
}
