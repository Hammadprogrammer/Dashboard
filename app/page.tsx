"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import HajjDashboardPage from "../pagelayout/hajj/page";
import UmrahDashboardPage from "../pagelayout/umrah/page";
import DomesticDashboardPage from "../pagelayout/domestic/page";
import InternationalTourDashboard from "../pagelayout/international-tour/page";
import WhyChooseUsDashboard from "../pagelayout/why-choose-us/page";
import UmrahServiceDashboard from "../pagelayout/umrah-service/page";
import CustomPilgrimageDashboard from "../pagelayout/custom-pilgrimage/page";
import TestimonialDashboard from "../pagelayout/testimonials/page";
// import ContactForm from "@/pagelayout/contact/page";

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
      <HajjDashboardPage />
      <UmrahDashboardPage />
      <DomesticDashboardPage />
      <InternationalTourDashboard />
      <WhyChooseUsDashboard/>
      <UmrahServiceDashboard/>
      <CustomPilgrimageDashboard/>
      <TestimonialDashboard/>
      {/* <ContactForm/> */}

    </div>
  );
};

export default Page;
