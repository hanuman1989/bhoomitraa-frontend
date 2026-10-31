"use client";

import { useModal } from "@/hooks/useModal";
import ComponentCard from "../../common/ComponentCard";
import Label from "../../form/Label";
import Input from "../../form/input/InputField";
import Button from "../../ui/button/Button";
import { Modal } from "../../ui/modal";
import { useTranslations } from "next-intl";

export default function FormInModal() {
  const tUi = useTranslations("examples.formInModal");

  const { isOpen, openModal, closeModal } = useModal();

  const handleSave = () => {
    // Handle save logic here
    console.log("Saving changes...");
    closeModal();
  };

  return (
    <ComponentCard title={tUi("formInModal")}>
      <Button size="sm" onClick={openModal}>
        {tUi("openModal")}
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-146 p-5 lg:p-10"
      >
        <form className="">
          <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
            {tUi("personalInformation")}
          </h4>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div className="col-span-1">
              <Label>{tUi("firstName")}</Label>
              <Input type="text" placeholder={tUi("emirhan")} />
            </div>

            <div className="col-span-1">
              <Label>{tUi("lastName")}</Label>
              <Input type="text" placeholder={tUi("boruch")} />
            </div>

            <div className="col-span-1">
              <Label>{tUi("lastName")}</Label>
              <Input type="email" placeholder="emirhanboruch55@gmail.com" />
            </div>

            <div className="col-span-1">
              <Label>{tUi("phone")}</Label>
              <Input type="text" placeholder="+09 363 398 46" />
            </div>

            <div className="col-span-1 sm:col-span-2">
              <Label>{tUi("bio")}</Label>
              <Input type="text" placeholder={tUi("teamManager")} />
            </div>
          </div>

          <div className="mt-6 flex w-full items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={closeModal}>
              {tUi("close")}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {tUi("saveChanges")}
            </Button>
          </div>
        </form>
      </Modal>
    </ComponentCard>
  );
}
