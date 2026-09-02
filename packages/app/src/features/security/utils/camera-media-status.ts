export type CameraMediaStatus =
  | 'available'
  | 'stream_unsupported'
  | 'snapshot_only'
  | 'media_browser_unavailable'
  | 'authentication_required'
  | 'unavailable';

export function classifyCameraMediaError(error: unknown): CameraMediaStatus | undefined {
  if (!error) return undefined;
  const value = error as { code?: unknown; message?: unknown; status?: unknown };
  const code = String(value.code ?? '').toLowerCase();
  const message = String(value.message ?? error).toLowerCase();
  const status = Number(value.status);
  if (status === 401 || status === 403 || /unauthori[sz]ed|forbidden|authentication/.test(message))
    return 'authentication_required';
  if (/media browser|browse media/.test(message)) return 'media_browser_unavailable';
  if (
    code === 'start_stream_failed' ||
    /does not support play stream service|stream unsupported|stream not supported/.test(message)
  )
    return 'stream_unsupported';
  if (/unavailable|not available|offline/.test(message)) return 'unavailable';
  return undefined;
}

export function resolveCameraMediaStatus(input: {
  available: boolean;
  streamCapable: boolean;
  snapshotUrl?: string;
  error?: unknown;
}): CameraMediaStatus {
  const errorStatus = classifyCameraMediaError(input.error);
  if (errorStatus) return errorStatus;
  if (!input.available) return 'unavailable';
  if (!input.streamCapable && input.snapshotUrl) return 'snapshot_only';
  return 'available';
}
