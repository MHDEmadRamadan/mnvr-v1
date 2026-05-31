import { getSupabaseClient } from "@/lib/supabase";

export type DeviceLookup = {
  id: string;
  imei: string;
  vehicleNumber: string | null;
};

export type ResolveDeviceInput = {
  imei: string;
  /** Required when creating a new device (IMEI not in DB). */
  vehicleNumber?: string;
};

export type ResolveDeviceResult =
  | { deviceId: string; created: false; device: DeviceLookup }
  | { deviceId: string; created: true; device: DeviceLookup }
  | { error: "IMEI_REQUIRED" }
  | { error: "VEHICLE_REQUIRED" };

/** Lookup only — does not create. */
export async function findDeviceByImei(imei: string): Promise<DeviceLookup | null> {
  const trimmed = imei.trim();
  if (!trimmed) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("device")
    .select("id, imei, vehicle:vehicle_id ( vehicle_number )")
    .eq("imei", trimmed)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const rawVehicle = data.vehicle as { vehicle_number: string | null } | { vehicle_number: string | null }[] | null;
  const vehicleNumber = Array.isArray(rawVehicle)
    ? (rawVehicle[0]?.vehicle_number ?? null)
    : (rawVehicle?.vehicle_number ?? null);

  return {
    id: data.id,
    imei: data.imei,
    vehicleNumber,
  };
}

/** @deprecated Use findDeviceByImei or resolveOrCreateDeviceForIssue */
export async function resolveDeviceIdByImei(imei: string): Promise<string | null> {
  const device = await findDeviceByImei(imei);
  return device?.id ?? null;
}

async function findVehicleIdByNumber(vehicleNumber: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("id")
    .eq("vehicle_number", vehicleNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function createVehicle(vehicleNumber: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert({ vehicle_number: vehicleNumber, description: "" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

async function createDevice(imei: string, vehicleId: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("device")
    .insert({ imei, vehicle_id: vehicleId, description: "" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Find device by IMEI, or create device (+ vehicle if needed) for new IMEIs.
 * Does NOT auto-populate issue fields — returns deviceId only.
 */
export async function resolveOrCreateDeviceForIssue(
  input: ResolveDeviceInput,
): Promise<ResolveDeviceResult> {
  const imei = input.imei.trim();
  if (!imei) return { error: "IMEI_REQUIRED" };

  const existing = await findDeviceByImei(imei);
  if (existing) {
    return { deviceId: existing.id, created: false, device: existing };
  }

  const vehicleNumber = input.vehicleNumber?.trim();
  if (!vehicleNumber) {
    return { error: "VEHICLE_REQUIRED" };
  }

  let vehicleId = await findVehicleIdByNumber(vehicleNumber);
  if (!vehicleId) {
    vehicleId = await createVehicle(vehicleNumber);
  }

  const deviceId = await createDevice(imei, vehicleId);
  return {
    deviceId,
    created: true,
    device: { id: deviceId, imei, vehicleNumber },
  };
}
