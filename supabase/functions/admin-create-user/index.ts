import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://mrnehemiah.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getKey(name: string, legacyName?: string) {
  const grouped = Deno.env.get(name);
  if (grouped) {
    try {
      const keys = JSON.parse(grouped);
      if (keys.default) return keys.default;
    } catch {
      // Fall back to the legacy secret name.
    }
  }
  return legacyName ? Deno.env.get(legacyName) ?? "" : "";
}

function clean(value: unknown, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);

  let adminClient: ReturnType<typeof createClient> | null = null;
  let newUserId: string | null = null;
  let storeId: string | null = null;
  let driverCreated = false;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKey = getKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const secretKey = getKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !publishableKey || !secretKey) {
      throw new Error("Server configuration is incomplete.");
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return response({ error: "Authentication required." }, 401);
    }

    const token = authorization.substring(7);
    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    adminClient = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user: adminUser }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !adminUser) return response({ error: "Invalid login session." }, 401);

    const { data: adminProfile, error: adminError } = await adminClient
      .from("profiles")
      .select("role, account_status")
      .eq("id", adminUser.id)
      .single();

    if (adminError || !adminProfile || adminProfile.role !== "admin" || adminProfile.account_status !== "active") {
      return response({ error: "Admin access required." }, 403);
    }

    const body = await req.json();
    const fullName = clean(body.full_name, 100);
    const email = clean(body.email, 254).toLowerCase();
    
    const phoneNumber = clean(body.phone_number, 30);
    const role = clean(body.role || "buyer", 20);
    const reason = clean(body.reason || "Created by Admin", 500);
    const gender = clean(body.gender, 30) || null;
    const dateOfBirth = clean(body.date_of_birth, 10) || null;
    const residentialAddress = clean(body.residential_address, 500) || null;

    if (fullName.length < 2) return response({ error: "Weka jina kamili sahihi." }, 400);
    if (!["buyer", "vendor", "driver"].includes(role)) {
      return response({ error: "Aina ya akaunti hairuhusiwi." }, 400);
    }
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response({ error: "Weka email sahihi." }, 400);
    }
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return response({ error: "Tarehe ya kuzaliwa si sahihi." }, 400);
    }
    if (role === "vendor" && clean(body.store_name, 120).length < 2) {
      return response({ error: "Weka jina la duka la Seller." }, 400);
    }

    const vehicleType = clean(body.vehicle_type, 30);
    if (role === "driver") {
      if (!phoneNumber) return response({ error: "Dereva lazima awe na namba ya simu." }, 400);
      if (!["motorcycle", "car", "bicycle", "other"].includes(vehicleType)) {
        return response({ error: "Chagua aina sahihi ya chombo cha usafiri." }, 400);
      }
    }

    const { data: created, error: createError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });
    if (createError || !created.user) {
      return response({ error: createError?.message ?? "Imeshindikana kutengeneza akaunti." }, 400);
    }
    newUserId = created.user.id;

    const { data: existingProfile, error: profileLookupError } = await adminClient
      .from("profiles")
      .select("id, zune_id")
      .eq("id", newUserId)
      .maybeSingle();

    if (profileLookupError) throw new Error("Imeshindikana kuthibitisha profile ya akaunti mpya.");

    const zuneId = existingProfile?.zune_id || crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
    const profilePayload = {
      full_name: fullName,
      email,
      phone_number: phoneNumber || null,
      gender,
      date_of_birth: dateOfBirth,
      residential_address: residentialAddress,
      zune_id: zuneId,
      role,
      is_verified: false,
      account_status: "active",
    };

    const profileResult = existingProfile
      ? await adminClient.from("profiles").update(profilePayload).eq("id", newUserId)
      : await adminClient.from("profiles").insert({ id: newUserId, ...profilePayload });

    if (profileResult.error) throw new Error("Profile haikuundwa: " + profileResult.error.message);

    if (role === "vendor") {
      const { data: store, error: storeError } = await adminClient
        .from("stores")
        .insert({
          owner_id: newUserId,
          store_name: clean(body.store_name, 120),
          description: clean(body.store_description, 1000) || null,
          category: clean(body.store_category, 100) || null,
          phone: clean(body.store_phone || phoneNumber, 30) || null,
          email,
          region: clean(body.store_region, 100) || null,
          district: clean(body.store_district, 100) || null,
          address: clean(body.store_address, 500) || null,
          verification_status: "unverified",
          is_active: true,
        })
        .select("id")
        .single();
      if (storeError || !store) throw new Error("Duka halikuundwa: " + (storeError?.message || "Unknown error"));
      storeId = store.id;
    }

    if (role === "driver") {
      const { error: driverError } = await adminClient.from("delivery_driver_profiles").insert({
        user_id: newUserId,
        full_name: fullName,
        phone_number: phoneNumber,
        email,
        national_id: clean(body.national_id, 100) || null,
        vehicle_type: vehicleType,
        vehicle_registration: clean(body.vehicle_registration, 60) || null,
        license_number: clean(body.license_number, 100) || null,
        date_of_birth: dateOfBirth,
        gender,
        region: clean(body.driver_region, 100) || null,
        district: clean(body.driver_district, 100) || null,
        residential_area: clean(body.driver_residential_area, 200) || null,
        emergency_phone: clean(body.emergency_phone, 30) || null,
        emergency_relation: clean(body.emergency_relation, 60) || null,
        vehicle_ownership: clean(body.vehicle_ownership, 30) || null,
        status: "pending",
      });
      if (driverError) throw new Error("Taarifa za dereva hazijahifadhiwa: " + driverError.message);
      driverCreated = true;
    }

    const { error: historyError } = await adminClient.from("admin_user_actions").insert({
      admin_id: adminUser.id,
      target_user_id: newUserId,
      action: "created",
      reason,
    });
    if (historyError) throw new Error("Audit log haikuhifadhiwa: " + historyError.message);

    return response({
      success: true,
      message: "Akaunti ya ZUNE imetengenezwa.",
      user: { id: newUserId, full_name: fullName, email, role, zune_id: zuneId },
      store_id: storeId,
      driver_status: driverCreated ? "pending" : null,
      email_invite_sent: true,
    }, 201);
  } catch (error) {
    console.error("Admin create user error:", error);
    if (adminClient && newUserId) {
      if (storeId) await adminClient.from("stores").delete().eq("id", storeId);
      if (driverCreated) await adminClient.from("delivery_driver_profiles").delete().eq("user_id", newUserId);
      await adminClient.from("profiles").delete().eq("id", newUserId);
      await adminClient.auth.admin.deleteUser(newUserId);
    }
    return response({
      error: error instanceof Error ? error.message : "Hitilafu isiyotarajiwa imetokea.",
    }, 500);
  }
});
