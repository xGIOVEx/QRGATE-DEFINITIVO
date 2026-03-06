import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-stone-950 group-[.toaster]:border-stone-100 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-stone-500",
          actionButton:
            "group-[.toast]:bg-stone-950 group-[.toast]:text-white group-[.toast]:rounded-xl font-bold",
          cancelButton:
            "group-[.toast]:bg-stone-100 group-[.toast]:text-stone-500 group-[.toast]:rounded-xl",
        },
      }}
      {...props} />
  );
}

export { Toaster, toast }
