export type DeletableSpine = {
  id?: string | null;
  storage_path?: string | null;
  model?: string | null;
  contributed_by?: string | null;
};

const CURATOR_UPLOAD_TYPES = new Set(["clothbound", "dust-jacket", "special-edition"]);

export function isExplicitCuratorUpload(spine: DeletableSpine, contributorIsCurator: boolean) {
  return Boolean(
    spine.id &&
    spine.storage_path?.trim() &&
    spine.contributed_by &&
    contributorIsCurator &&
    spine.model &&
    CURATOR_UPLOAD_TYPES.has(spine.model),
  );
}

