#ref: https://stackoverflow.com/questions/12090503/listing-available-com-ports-with-python
import serial.tools.list_ports
import sys
import os
import json

ports = serial.tools.list_ports.comports()
for port, description, hwid in sorted(ports):
        print("port-{}: description -{} , hwid-[{}]".format(port, description, hwid))

class COMPorts:
    def __init__(self, data: list):
        self.data = data

    @classmethod
    def get_com_ports(cls):
        data = []
        ports = list(serial.tools.list_ports.comports())

        for port_ in ports:
            obj = Object(data=dict({"device": port_.device, "description": port_.description.split("(")[0].strip()}))
            data.append(obj)

        return cls(data=data)

    @staticmethod
    def get_description_by_device(device: str):
        for port_ in COMPorts.get_com_ports().data:
            if port_.device == device:
                return port_.description
        return None

    @staticmethod
    def get_device_by_description(description: str):
        for port_ in COMPorts.get_com_ports().data:
            if port_.description == description:
                return port_.device
        return None


class Object:
    def __init__(self, data: dict):
        self.data = data
        self.device = data.get("device")
        self.description = data.get("description")


if __name__ == "__main__":
    ports = {}
    for port in COMPorts.get_com_ports().data:
        print("PORT:[{}]  /  DESCRIPTION:{}".format(port.device, port.description))
        if port.description == "USB <-> Serial Converter - USB <-> Serial Converter": # linux
            ports["dxlCh0"]={"port":port.device,"baudrate":57600}
        elif port.description == "USB Serial Port": # widonw
            ports["dxlCh0"]={"port":port.device,"baudrate":57600}
        else:
            ports[port.description]={"port":port.device,"baudrate":57600}

    if not "dxlCh0" in ports:
        print("ERROR:failed to find serial port named '"+"dxlCh0"+"'")
        quit()

    print("Saved the scanned comports:")
    print(ports)
