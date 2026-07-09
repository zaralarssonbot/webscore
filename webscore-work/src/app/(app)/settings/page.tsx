import { requireCapability, can } from "@/lib/auth";
import { PageHeader, PageBody } from "@/components/shared/page-header";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsPage() {
  const { organization } = await requireCapability(can.manageSettings);

  return (
    <>
      <PageHeader
        title="Inställningar"
        description="Hantera företagsuppgifter, offertvillkor, utseende och notiser."
      />
      <PageBody>
        <SettingsTabs
          org={{
            name: organization.name,
            orgNumber: organization.orgNumber,
            industry: organization.industry,
            email: organization.email,
            phone: organization.phone,
            address: organization.address,
            defaultVatRate: organization.defaultVatRate,
            currency: organization.currency,
            paymentTerms: organization.paymentTerms,
            quoteTerms: organization.quoteTerms,
            quoteNumberPrefix: organization.quoteNumberPrefix,
            workOrderNumberPrefix: organization.workOrderNumberPrefix,
          }}
        />
      </PageBody>
    </>
  );
}
