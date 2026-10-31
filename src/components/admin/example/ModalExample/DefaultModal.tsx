"use client";

import ComponentCard from "../../common/ComponentCard";

import { useModal } from "@/hooks/useModal";
import Button from "../../ui/button/Button";
import { Modal } from "../../ui/modal";
import { useTranslations } from "next-intl";

export default function DefaultModal() {
  const tUi = useTranslations("examples.defaultModal");

  const { isOpen, openModal, closeModal } = useModal();
  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };

  return (
    <div>
      <ComponentCard title={tUi("defaultModal")}>
        <Button size="sm" onClick={openModal}>
          {tUi("openModal")}
        </Button>
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-150 p-5 lg:p-10"
        >
          <h4 className="text-title-sm mb-7 font-semibold text-gray-800 dark:text-white/90">
            {tUi("modalHeading")}
          </h4>
          <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
            {tUi("loremIpsumDolorSitAmetConsecteturAdipiscingElitPellentesque")}
          </p>
          <p className="mt-5 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {tUi(
              "loremIpsumDolorSitAmetConsecteturAdipiscingElitPellentesque2",
            )}
          </p>
          <div className="mt-8 flex w-full items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={closeModal}>
              {tUi("close")}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {tUi("saveChanges")}
            </Button>
          </div>
        </Modal>
      </ComponentCard>
    </div>
  );
}
