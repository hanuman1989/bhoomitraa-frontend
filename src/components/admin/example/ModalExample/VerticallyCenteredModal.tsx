"use client";

import { useModal } from "@/hooks/useModal";
import ComponentCard from "../../common/ComponentCard";
import Button from "../../ui/button/Button";
import { Modal } from "../../ui/modal";
import { useTranslations } from "next-intl";

export default function VerticallyCenteredModal() {
  const tUi = useTranslations("examples.verticallyCenteredModal");

  const { isOpen, openModal, closeModal } = useModal();

  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };

  return (
    <ComponentCard title={tUi("verticallyCenteredModal")}>
      <Button size="sm" onClick={openModal}>
        {tUi("openModal")}
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        showCloseButton={false}
        className="max-w-126.75 p-6 lg:p-10"
      >
        <div className="text-center">
          <h4 className="sm:text-title-sm mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            {tUi("allDoneSuccessConfirmed")}
          </h4>
          <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
            {tUi("loremIpsumDolorSitAmetConsecteturAdipiscingElitPellentesque")}
          </p>

          <div className="mt-8 flex w-full items-center justify-center gap-3">
            <Button size="sm" variant="outline" onClick={closeModal}>
              {tUi("close")}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {tUi("saveChanges")}
            </Button>
          </div>
        </div>
      </Modal>
    </ComponentCard>
  );
}
