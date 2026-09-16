import { useRef, useState } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { uploadImage } from "../../lib/uploads";
import { resolveMediaUrl } from "../../lib/config";
import { Spinner } from "./Spinner";

interface PhotoUploadProps {
	id?: string;
	label: string;
	value: string | null;
	onChange: (url: string | null) => void;
	error?: string;
}

export function PhotoUpload({ id, label, value, onChange, error: externalError }: PhotoUploadProps) {
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

	const displayUrl = preview ?? resolveMediaUrl(value);
	const shownError = error ?? externalError;
	const errorId = id ? `${id}-error` : undefined;

	return (
		<div>
			<span id={id && `${id}-label`} className="mb-1 block text-sm font-medium text-slate-700">
				{label}
			</span>
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
							id={id}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							className="sr-only"
							onChange={handleFileChange}
							disabled={uploading}
							aria-invalid={shownError ? true : undefined}
							aria-describedby={shownError ? errorId : undefined}
							aria-labelledby={id && `${id}-label`}
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
			{shownError && (
				<p id={errorId} className="mt-1 text-xs text-red-600">
					{shownError}
				</p>
			)}
		</div>
	);
}
