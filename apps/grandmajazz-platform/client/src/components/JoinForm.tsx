import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { TITLES, FamilyMember } from "@/lib/mockData";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiUrl } from "@/lib/api";

const formSchema = z.object({
  title: z.string().min(1, "Please select a title"),
  name: z.string().min(2, "Name must be at least 2 characters").max(12, "Name too long"),
  email: z.string().email("Please enter a valid email"),
});

interface JoinFormProps {
  onJoin: (member: Omit<FamilyMember, "id">) => void;
  onExistingMember: (member: FamilyMember) => void;
}

export function JoinForm({ onJoin, onExistingMember }: JoinFormProps) {
  const [isChecking, setIsChecking] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      name: "",
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsChecking(true);
    try {
      const checkRes = await fetch(apiUrl("/api/members/check-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const checkData = await checkRes.json();
      if (checkData.exists) {
        setIsChecking(false);
        onExistingMember(checkData.member);
        form.reset();
        return;
      }
    } catch (error) {
      console.error("Error checking email:", error);
    }
    setIsChecking(false);

    const member: Omit<FamilyMember, "id"> = {
      title: values.title,
      name: values.name,
      email: values.email,
    };

    onJoin(member);
    form.reset();
  }

  return (
    <div className="relative z-10 w-full max-w-md mx-auto px-6">
      <motion.div
        key="form"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex flex-col items-end justify-between w-full max-w-md border-2 border-white/90 rounded-[10px] bg-black text-white p-6 relative overflow-hidden"
      >
        <div className="w-full flex flex-col items-end">
          <div className="text-right mb-6 w-full">
            <h2 className="text-lg md:text-xl font-sans font-light tracking-wider mb-2">Join the Family</h2>
            <p className="text-xs md:text-sm font-sans font-light tracking-wider opacity-70">Add your brick to the wall</p>
          </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex flex-col items-end w-full">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-transparent border-0 text-sm md:text-base font-sans font-light tracking-wider text-right h-auto p-0 w-full focus:ring-0 focus:border-0 [&>span]:text-right [&>span]:justify-end" dir="rtl">
                              <SelectValue placeholder="Select title" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-black border-white/20 text-white rounded-[10px] max-h-[300px]">
                            {TITLES.map((title) => (
                              <SelectItem
                                key={title}
                                value={title}
                                className="focus:bg-white/20 focus:text-white cursor-pointer"
                              >
                                {title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <Input
                            placeholder="Name"
                            {...field}
                            className="bg-transparent border-0 text-sm md:text-base font-sans font-light tracking-wider text-right h-auto p-0 focus:border-0 focus:ring-0 placeholder:text-white/30 w-full"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <Input
                            placeholder="Email"
                            type="email"
                            {...field}
                            className="bg-transparent border-0 text-sm md:text-base font-sans font-light tracking-wider text-right h-auto p-0 focus:border-0 focus:ring-0 placeholder:text-white/30 w-full"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <button
                    type="submit"
                    className="flex flex-col items-end justify-center w-[120px] h-[45px] border-2 border-white/90 rounded-[10px] bg-black text-white p-2 mt-4 hover:bg-white hover:text-black transition-colors duration-300"
                    data-testid="button-submit"
                  >
                    <span className="text-xs font-galvji-light tracking-extra-wide text-right w-full px-1">Add to</span>
                    <span className="text-xs font-galvji-light tracking-extra-wide text-right w-full px-1">Wall</span>
                  </button>
                </form>
              </Form>
        </div>
      </motion.div>
    </div>
  );
}
