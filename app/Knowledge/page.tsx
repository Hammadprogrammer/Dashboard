import React from 'react'
import KnowledgeDashboard from '@/pagelayout/knowledge/knowledge-pdf/pdf'
import VideoDashboard from '@/pagelayout/knowledge/knowledge-videos/videos'

type Props = {}

const page = (props: Props) => {
  return (
   <>
   <KnowledgeDashboard/>
   <VideoDashboard/>
    
   </>
  )
}

export default page