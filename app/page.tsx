import React from 'react'
import Navbar from "../sharecomponent/navbar/navbar"
import HajjDashboardPage from './dashboard/hajj/page'
import UmrahDashboardPage from './dashboard/umrah/page'
import DomesticDashboardPage from './dashboard/domestic/page'
import InternationalTourDashboard from './dashboard/international-tour/page'

const page = () => {
  return (
    <div>
        <Navbar/>
        <HajjDashboardPage/>
        <UmrahDashboardPage/>
        <DomesticDashboardPage/>
        <InternationalTourDashboard/>
    </div>
  )
}

export default page
