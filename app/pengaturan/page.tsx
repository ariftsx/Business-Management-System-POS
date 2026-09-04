import { createClient } from "../../lib/supabase/server";
import SettingsClient, { type BusinessSettingsData } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_settings")
    .select("*")
    .eq("id", true)
    .single();

  const initialSettings: BusinessSettingsData = {
    business_name: data?.business_name ?? "Karya Teknik Makmur D-Printing",
    address: data?.address ?? "",
    phone: data?.phone ?? "",
    email: data?.email ?? "",
    bank_name: data?.bank_name ?? "",
    bank_account_number: data?.bank_account_number ?? "",
    bank_account_holder: data?.bank_account_holder ?? "",
    dana_number: data?.dana_number ?? "",
    dana_account_name: data?.dana_account_name ?? "",
    qris_image_url: data?.qris_image_url ?? "",
    logo_url: data?.logo_url ?? "",
    receipt_footer: data?.receipt_footer ?? "Terima kasih telah berbelanja di KTM D-Printing.",
  };

  return <SettingsClient initialSettings={initialSettings} />;
}
