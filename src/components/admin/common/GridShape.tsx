import Image from "next/image";
import { useTranslations } from "next-intl";

export default function GridShape() {
  const tUi = useTranslations("ui.gridShape");

  return (
    <>
      <div className="absolute end-0 top-0 -z-1 w-full max-w-[250px] xl:max-w-[450px]">
        <Image
          width={540}
          height={254}
          src="/images/shape/grid-01.svg"
          alt={tUi("grid")}
        />
      </div>
      <div className="absolute start-0 bottom-0 -z-1 w-full max-w-[250px] rotate-180 xl:max-w-[450px]">
        <Image
          width={540}
          height={254}
          src="/images/shape/grid-01.svg"
          alt={tUi("grid")}
        />
      </div>
    </>
  );
}
