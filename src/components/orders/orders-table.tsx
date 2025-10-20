"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronsDown, ChevronRight } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";
import clsx from "clsx";

const statusVariant = (s?: string) => {
  switch (s) {
    case "completed": return "default";
    case "processing": return "secondary";
    case "cancelled": return "destructive";
    case "on-hold": return "outline";
    case "refunded": return "outline";
    default: return "secondary";
  }
};

interface Order {
  id: string;
  wooId: number;
  status: string | null;
  total: number;
  currency: string | null;
  dateCreated: string;
  paymentMethodTitle: string | null;
  billingFirstName: string | null;
  billingLastName: string | null;
  billingCity: string | null;
  billingCountry: string | null;
  shippingFirstName: string | null;
  shippingLastName: string | null;
  shippingCity: string | null;
  shippingCountry: string | null;
  billingAddress1: string | null;
  billingPhone: string | null;
  billingEmail: string | null;
  shippingAddress1: string | null;
  paymentMethod?: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  orderItems: Array<{
    name: string;
    quantity: number;
    sku: string | null;
    total: number;
  }>;
  customer: {
    id?: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

export function OrdersTable({ orders }: { orders: Order[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  return (
    <div className="rounded-2xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="text-xs uppercase text-muted-foreground">
            <TableHead className="w-10"></TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Shipping</TableHead>
            <TableHead>Billing</TableHead>
            <TableHead>Payment via</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => {
            const isOpen = openId === o.id;
            const shippingName = o.shippingFirstName && o.shippingLastName 
              ? `${o.shippingFirstName} ${o.shippingLastName}` 
              : null;
            const billingName = o.billingFirstName && o.billingLastName 
              ? `${o.billingFirstName} ${o.billingLastName}` 
              : null;
            const customerName = o.customer?.firstName && o.customer?.lastName 
              ? `${o.customer.firstName} ${o.customer.lastName}` 
              : null;
            const billingFull = [
              o.billingAddress1,
              o.billingCity,
              o.billingCountry
            ].filter(Boolean).join(", ");
            const shippingFull = [
              o.shippingAddress1,
              o.shippingCity,
              o.shippingCountry
            ].filter(Boolean).join(", ");

            return (
              <React.Fragment key={o.id}>
                <TableRow
                  className={clsx("cursor-pointer hover:bg-muted/40", isOpen && "bg-muted/30")}
                  onClick={() => toggle(o.id)}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(o.id)}
                  aria-expanded={isOpen}
                >
                  <TableCell className="w-10">
                    {isOpen ? <ChevronsDown size={16}/> : <ChevronRight size={16}/>}
                  </TableCell>
                  <TableCell>#{o.wooId}</TableCell>
                  <TableCell>{fmtDate(o.dateCreated)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(o.status) as any}>
                      {o.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {fmtMoney(o.total, o.currency)}
                  </TableCell>
                  <TableCell className="truncate max-w-[220px]">
                    <div className="font-medium">{shippingName || "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[o.shippingCity, o.shippingCountry].filter(Boolean).join(", ") || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="truncate max-w-[220px]">
                    <div className="font-medium">{billingName || "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[o.billingCity, o.billingCountry].filter(Boolean).join(", ") || "—"}
                    </div>
                  </TableCell>
                  <TableCell>{o.paymentMethodTitle || "—"}</TableCell>
                </TableRow>

                {isOpen && (
                  <TableRow>
                    <TableCell colSpan={8} className="bg-muted/20 p-4">
                      <div className="space-y-4">
                        {/* Details block - full width */}
                        <div className="rounded-lg border p-3 text-sm">
                          <h4 className="text-sm font-semibold mb-2">Details</h4>
                          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                            <div className="text-muted-foreground">Customer</div>
                            <div className="truncate">
                              {o.customer?.id ? (
                                <Link href={`/customers/${o.customer.id}`} className="underline underline-offset-2">
                                  {customerName || o.customer.email || "—"}
                                </Link>
                              ) : (
                                customerName || o.customer?.email || "—"
                              )}
                            </div>

                            <div className="text-muted-foreground">Email</div>
                            <div className="truncate">{o.billingEmail || o.customer?.email || "—"}</div>

                            <div className="text-muted-foreground">Phone</div>
                            <div className="truncate">{o.billingPhone || "—"}</div>

                            <div className="text-muted-foreground">Payment via</div>
                            <div className="truncate">{o.paymentMethod || o.paymentMethodTitle || "—"}</div>

                            <div className="text-muted-foreground">Status</div>
                            <div>
                              <Badge variant={statusVariant(o.status) as any}>{o.status || 'Unknown'}</Badge>
                            </div>

                            <div className="text-muted-foreground">Billing address</div>
                            <div className="truncate">{billingFull || "—"}</div>

                            <div className="text-muted-foreground">Shipping address</div>
                            <div className="truncate">{shippingFull || "—"}</div>

                            <div className="text-muted-foreground">Marketing</div>
                            <div className="truncate">
                              {o.utmSource || o.utmMedium || o.utmCampaign
                                ? `${o.utmSource || "—"} / ${o.utmMedium || "—"} • ${o.utmCampaign || "—"}`
                                : "—"}
                            </div>
                          </div>
                        </div>

                        {/* Products block - full width */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Products</h4>
                          <div className="rounded-lg border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead className="w-24 text-right">Qty</TableHead>
                                  <TableHead className="w-28 text-right">Line total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {o.orderItems?.length
                                  ? o.orderItems.map((li, i) => (
                                      <TableRow key={i}>
                                        <TableCell className="truncate">{li.name}</TableCell>
                                        <TableCell className="text-right">{li.quantity}</TableCell>
                                        <TableCell className="text-right">{fmtMoney(li.total, o.currency)}</TableCell>
                                      </TableRow>
                                    ))
                                  : <TableRow><TableCell colSpan={3} className="text-sm text-muted-foreground">No items</TableCell></TableRow>}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default OrdersTable;
