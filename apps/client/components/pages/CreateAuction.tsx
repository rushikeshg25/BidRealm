"use client";

import { createAuction } from "@/actions/CreateAuction";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Auctionschema, AuctionT } from "@/types/auction";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { User } from "lucia";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import ImageUpload from "../ImageUpload";
import { Button } from "../ui/button";
import DateTimePickerComponent from "../ui/DateTimePickerComponent";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export enum Categories {
  ART,
  COLLECTABLES,
  ELECTRONICS,
  VEHICLES,
  WATCHES,
  FASHION,
  SHOES,
}
const CategoriesArray = [
  "Art",
  "Collectables",
  "Electronics",
  "Vehicles",
  "Watches",
  "Fashion",
  "Shoes",
];

const CreateAuction = ({ user }: { user: User }) => {
  const router = useRouter();
  const [category, setCategory] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [imgUrl, setImgUrl] = useState<string>("");
  // The `data` state that used to live here is gone -- react-hook-form already
  // holds the form's values and hands them to onSubmit. Mirroring them into a
  // second useState was what created the stale-submit bug.
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AuctionT>({
    resolver: zodResolver(Auctionschema),
  });

  const { mutate: server_createAuction } = useMutation({
    // The payload is an argument now. It used to be read from the `data` state
    // variable, which onSubmit set with setData() and then immediately submitted
    // -- but setState is asynchronous, so the closure still held the previous
    // value and the first submit posted the empty initial state.
    //
    // `userId` is also gone: it used to be passed from the client, which meant
    // anyone could create auctions attributed to any user. The action reads it
    // from the session.
    mutationFn: async (payload: AuctionT) => {
      return await createAuction(payload, imgUrl);
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Auction created successfully!");
      router.push("/my-auctions");
    },
    onError: () => {
      toast.error("We couldn't create your auction. Please try again.");
    },
  });

  const startDateHandler = (date: Date) => {
    setStartDate(date);
    setValue("startDate", date);
  };
  const endDateHandler = (date: Date) => {
    setEndDate(date);
    setValue("endDate", date);
  };
  const ImageURL = (url: string) => {
    setImgUrl(url);
  };

  useEffect(() => {
    setValue("startDate", startDate);
  }, [startDate]);
  useEffect(() => {
    setValue("endDate", endDate);
  }, [endDate]);
  useEffect(() => {
    setValue("Categories", category);
  }, [category]);

  const onSubmit = (data: AuctionT) => {
    server_createAuction(data);
  };
  return (
    <div className="max-w-4xl px-4 py-5 mx-auto mt-10 sm:px-6 lg:px-8 dark:border border rounded-lg mb-10">
      <h1 className="mb-6 text-3xl font-bold flex items-center justify-center">
        <>Create New Auction</>
      </h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 w-full">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input {...register("title")} placeholder="Enter auction title" />
              {errors.title && (
                <p className="text-red-500">{errors.title.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Enter auction description"
              />
              {errors.description && (
                <p className="text-red-500">{errors.description.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="description">Starting Price</Label>
              <Input
                type="number"
                id="startingPrice"
                onChange={(e) => {
                  setValue("startingPrice", Number(e.target.value));
                }}
                placeholder="Enter starting Bid price"
              />
              {errors.startingPrice && (
                <p className="text-red-500">{errors.startingPrice.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date & Time</Label>
                <DateTimePickerComponent Datehandler={startDateHandler} />
                {errors.startDate && (
                  <p className="text-red-500">{errors.startDate.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="end-date">End Date & Time</Label>
                <DateTimePickerComponent Datehandler={endDateHandler} />
                {errors.endDate && (
                  <p className="text-red-500">{errors.endDate.message}</p>
                )}
              </div>
            </div>
            <div className="w-full flex flex-row items-center justify-between">
              <Label htmlFor="categories">Select Category</Label>
              <Select onValueChange={(value) => setCategory(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  {CategoriesArray.map((category) => (
                    <SelectItem value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.Categories && (
                <p className="text-red-500">{errors.Categories.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 h-full">
            <div className="flex items-center justify-center h-full">
              <ImageUpload ImageURL={ImageURL} />
            </div>
          </div>
        </div>
        <div className="flex justify-center w-full mt-3">
          <Button type="submit" className="w-1/3">
            Publish
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateAuction;
