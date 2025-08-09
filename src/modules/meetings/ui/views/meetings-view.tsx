"use client";

import { DataTable } from "@/components/data-table";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { useTRPC } from "@/trpc/client";
import {  useSuspenseQuery } from "@tanstack/react-query";
import { columns } from "../components/columns";
import { EmptyState } from "@/components/empty-state";

export const MeetingView = () => {
    const trpc = useTRPC();
    const {data} = useSuspenseQuery (trpc.meetings.getMany.queryOptions({}));
    
    return (
        <div className="overflow-x-scroll">
          <DataTable data={data.items} columns={columns}/>
          {data.items.length === 0 && (
                <EmptyState
                    title="Create your first meeting"
                    description="Schedule a meeting to connect with others. Each meeting lets you
                                 collaborate, share ideas, and interact with participants in real time."
                />
                      )}
        </div>
    );
}; 

export const MeetingsViewLoading = () => {
    return (
        <LoadingState
           title="Loading Meetings"
            description="This may take a few seconds"
        />
            );
};

export const MeetingsViewError = () => {
    return (
            <ErrorState
                title="Error Loading Meetings"
                description="Something went wrong"
            />
            )
}
