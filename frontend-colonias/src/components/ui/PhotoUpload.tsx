import { useRef, useState } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { uploadImage } from "../../lib/uploads";
import { Spinner } from "./Spinner";

interface PhotoUploadProps {
	label: string;
	value: string | null;
	onChange: (url: string | null) => void;
}

export function PhotoUpload({ label, value, onChange }: PhotoUploadProps) {
	const [preview, setPreview] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		setError(null);
		const localPreview = URL.createObjectURL(file);
		setPreview(localPreview);
		setUploading(true);
		try {
			const url = await uploadImage(file);
			onChange(url);
		} catch (err) {
			setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
			setPreview(null);
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = "";
		}
	}

	const displayUrl = preview ?? value;

	return (
		<div>
			<span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
			<div className="flex items-center gap-3">
				<div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
					{displayUrl ? (
						<img src={displayUrl} alt="" className="h-full w-full object-cover" />
					) : (
						<PhotoIcon className="h-8 w-8 text-slate-300" />
					)}
					{uploading && (
						<div className="absolute flex h-20 w-20 items-center justify-center bg-white/70">
							<Spinner size="sm" />
						</div>
					)}
				</div>
				<div className="flex flex-col gap-1">
					<label className="cursor-pointer text-sm font-medium text-teal-700 hover:text-teal-800">
						{value || preview ? "Cambiar imagen" : "Subir imagen"}
						<input
							ref={inputRef}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							className="hidden"
							onChange={handleFileChange}
							disabled={uploading}
						/>
					</label>
					{(value || preview) && (
						<button
							type="button"
							onClick={() => {
								setPreview(null);
								onChange(null);
							}}
							className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
						>
							<XMarkIcon className="h-3.5 w-3.5" />
							Quitar
						</button>
					)}
				</div>
			</div>
			{error && <p className="mt-1 text-xs text-red-600">{error}</p>}
		</div>
	);
}
