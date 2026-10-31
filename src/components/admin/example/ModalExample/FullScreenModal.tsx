"use client";

import { useModal } from "@/hooks/useModal";
import ComponentCard from "../../common/ComponentCard";

import Button from "../../ui/button/Button";
import { Modal } from "../../ui/modal";
import { useTranslations } from "next-intl";

export default function FullScreenModal() {
  const tUi = useTranslations("examples.fullScreenModal");

  const {
    isOpen: isFullscreenModalOpen,
    openModal: openFullscreenModal,
    closeModal: closeFullscreenModal,
  } = useModal();

  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeFullscreenModal();
  };

  return (
    <ComponentCard title={tUi("fullScreenModal")}>
      <Button size="sm" onClick={openFullscreenModal}>
        {tUi("openModal")}
      </Button>
      <Modal
        isOpen={isFullscreenModalOpen}
        onClose={closeFullscreenModal}
        isFullscreen={true}
        showCloseButton={true}
      >
        <div className="fixed top-0 left-0 flex h-screen w-full flex-col justify-between overflow-x-hidden overflow-y-auto bg-white p-6 lg:p-10 dark:bg-gray-900">
          <div>
            <h4 className="text-title-sm mb-7 font-semibold text-gray-800 dark:text-white/90">
              {tUi("modalHeading")}
            </h4>
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              {tUi(
                "loremIpsumDolorSitAmetConsecteturAdipiscingElitPellentesque",
              )}
            </p>
            <p className="mt-5 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {tUi(
                "loremIpsumDolorSitAmetConsecteturAdipiscingElitPellentesque2",
              )}
            </p>
            <p className="mt-5 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {tUi(
                "loremIpsumDolorSitAmetConsecteturAdipiscingElitPellentesque3",
              )}
            </p>
          </div>
          <div className="mt-8 flex w-full items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={closeFullscreenModal}>
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
