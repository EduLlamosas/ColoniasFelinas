import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";

interface ComboBoxProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	options: string[];
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
}

export function ComboBox({ id, value, onChange, options, placeholder, required, disabled }: ComboBoxProps) {
	const trimmed = value.trim();
	const filtered =
		trimmed === "" ? options : options.filter((option) => option.toLowerCase().includes(trimmed.toLowerCase()));
	const showCreateOption =
		trimmed !== "" && !options.some((option) => option.toLowerCase() === trimmed.toLowerCase());

	return (
		<Combobox value={value} onChange={(next) => next != null && onChange(next)} disabled={disabled}>
			<div className="relative">
				<ComboboxInput
					id={id}
					required={required}
					autoComplete="off"
					className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/40 disabled:bg-slate-100 disabled:text-slate-500"
					displayValue={(v: string) => v}
					placeholder={placeholder}
					onChange={(event) => onChange(event.target.value)}
				/>
				<ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
					<ChevronUpDownIcon className="h-4 w-4" />
				</ComboboxButton>

				<ComboboxOptions
					transition
					className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-slate-200 empty:hidden focus:outline-none data-[closed]:opacity-0"
				>
					{showCreateOption && (
						<ComboboxOption
							value={trimmed}
							className="cursor-pointer select-none px-3 py-2 text-teal-700 data-[focus]:bg-teal-50"
						>
							Usar «{trimmed}»
						</ComboboxOption>
					)}
					{filtered.map((option) => (
						<ComboboxOption
							key={option}
							value={option}
							className="group flex cursor-pointer select-none items-center justify-between px-3 py-2 text-slate-900 data-[focus]:bg-teal-50"
						>
							{option}
							<CheckIcon className="hidden h-4 w-4 text-teal-600 group-data-[selected]:block" />
						</ComboboxOption>
					))}
				</ComboboxOptions>
			</div>
		</Combobox>
	);
}
