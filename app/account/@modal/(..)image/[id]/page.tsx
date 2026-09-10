import { connection } from "next/server";
import { getGalleryImage } from "@/lib/gallery";
import { parseImageId } from "@/lib/urls";
import { getCurrentUser } from "@/lib/users/session";
import { isImageSaved } from "@/lib/users/queries";
import { Modal } from "@/app/_components/website/Modal";
import { ImageDetail, IMAGE_TITLE_ID } from "@/app/_components/website/ImageDetail";
import { SaveImageButton } from "@/app/_components/ui/SaveImageButton";

export default async function AccountInterceptedImage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const id = parseImageId((await params).id);
  if (!id) return null;
  const [image, user] = await Promise.all([getGalleryImage(id), getCurrentUser()]);
  if (!image) return null;
  const saved = user ? await isImageSaved(user.id, id) : false;
  return <Modal labelledBy={IMAGE_TITLE_ID} headerAction={<SaveImageButton imageId={id} initiallySaved={saved} variant="icon" />}><ImageDetail img={image} variant="modal" /></Modal>;
}
