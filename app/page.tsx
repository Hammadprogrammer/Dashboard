"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Navbar from "../sharecomponent/navbar/navbar";
import HajjDashboardPage from "./dashboard/hajj/page";
import UmrahDashboardPage from "./dashboard/umrah/page";
import DomesticDashboardPage from "./dashboard/domestic/page";
import InternationalTourDashboard from "./dashboard/international-tour/page";

const Page = () => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login"); 
    } else {
      setLoading(false); 
    }
  }, [router]);

  if (loading) {
    return <p className="text-center mt-10">Loading...</p>;
  }

  return (
    <div>
      <Navbar />
      <HajjDashboardPage />
      <UmrahDashboardPage />
      <DomesticDashboardPage />
      <InternationalTourDashboard />
    </div>
  );
};

export default Page;
