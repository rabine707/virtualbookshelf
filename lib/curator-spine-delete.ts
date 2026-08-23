export type DeletableSpine = {
  id?: string | null;
  storage_path?: string | null;
  model?: string | null;
  contributed_by?: string | null;
};

export function isDeletableCatalogSpine(spine: DeletableSpine) {
  return Boolean(
    spine.id &&
    spine.storage_path?.trim(),
  );
}
